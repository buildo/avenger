import t from 'tcomb';
import findKey from 'lodash/findKey';
import some from 'lodash/some';
import assign from 'lodash/assign';
import { ObservableCache } from '../query/ObservableCache';
import { refetch } from '../cache/strategies';
import { cacheFetch } from '../query/operators';
import { compose, product } from '../fetch/operators';

// find a node key (P) by `fetch`
function findP(inputOrGraph, f) {
  // returns the `P` (aka `key` of `inputOrGraph` holding the given `f` as `fetch`)
  return findKey(inputOrGraph, ({ fetch }) => fetch === f);
}

function derivateA(inputOrGraph, P) {
  // possiblyNaked meaning that, since this fn is recursive, it might end up
  // workingon a previously visited (and thus "cached") node
  const possiblyNaked = inputOrGraph[P];
  return possiblyNaked.A || (() => {
    switch (possiblyNaked.fetch.type) {
      case 'composition':
        // in a composition, the "total A" is the master's A
        // https://github.com/buildo/avenger#composition
        return derivateA(inputOrGraph, findP(inputOrGraph, possiblyNaked.fetch.master));
      case 'product':
        // in a product, "total A" is [A1, ..., An]
        // https://github.com/buildo/avenger#product
        // In practice, given the "deep" array, we can easily pick and redistribute
        // the correct pieces of A when given a flat A values object
        return possiblyNaked.fetch.fetches.map(f => derivateA(inputOrGraph, findP(inputOrGraph, f)));
      default:
        // a fetch that is neither a composition or a product, **must** carry A information
        throw new Error(`missing A for naked '${P}'`);
    }
  })();
}

function asCached(inputOrGraph, fetch, P, strategy) {
  if (inputOrGraph[P] && t.Function.is(inputOrGraph[P].cachedFetch)) {
    // if this node has already been decorated with a cached version,
    // reuse it
    return inputOrGraph[P].cachedFetch;
  }

  // if this is a "final"/"atom" node (no composition, no product)
  if (t.Nil.is(fetch.type)) {
    // we actually create a cache
    // `P` is not ambigous (Ps are keys for the input graph description)
    const cache = new ObservableCache({ name: P });
    // return the cached version, defaulting to `refetch` if no strategy is provided
    return cacheFetch(fetch, strategy || refetch, cache);
  } else {
    // this is a composition or product
    // given in terms of (possibly) "naked" fetches.
    // We should reconstruct the same "tree"
    // but using `cachedFetch`es along the way instead of naked ones.
    // "(possibly)" above means that we might encounter some nodes already
    // "cached", if we visited and created the cached version for that node previously
    if (fetch.type === 'composition') {
      // see https://github.com/buildo/avenger#optimisations "composition"
      const masterP = findP(inputOrGraph, fetch.master);
      const slaveP = findP(inputOrGraph, fetch.slave);
      return compose(
        asCached(inputOrGraph, fetch.master, masterP, strategy),
        fetch.ptoa,
        asCached(inputOrGraph, fetch.slave, slaveP, strategy)
      );
    } else { // fetch.type === 'product'
      // see https://github.com/buildo/avenger#optimisations "product"
      return product(
        fetch.fetches.map(f => asCached(inputOrGraph, f, findP(inputOrGraph, f), strategy))
      );
    }
  }
}

// entry point for "creating" (preprocessing) the runtime graph
//
// `input` is a big object in the form:
//
//   {
//    ...
//    // Each node is identified by a key, that we refer to as 'P': the payload label
//    // e.g. 'sample', or 'samples', or 'testBySample'
//    Pi: {
//
//      // the node fetch function. Either an "atomic fetch" or a `composition` or a `product`
//      //
//      fetch,
//
//      // cache strategy. See `cache/strategies`. e.g. `Expire`, `refetch`, ...
//      //
//      strategy,
//
//      // The "arguments" labels. Similar in concept to a function signature, where each
//      // string label identifies an argument and its type
//      // it should be provided for "atomic" fetches, while it is
//      // internally derived for `composition`s and `product`s.
//      // For a `composition` it is the `master`'s A. For a product it is `[A1, ..., An]`.
//      //
//      A: ['a1', ..., 'an']
//    },
//    ...
//   }
//
// The objective of this function is to "decorate" the given node
// with a cached version of itself (the one used in practice) and
// more information that is needed at runtime
//
export function make(input) {
  const Ps = Object.keys(input);
  const graph = Ps.reduce((graph, P) => {
    // work on this "naked" fetch/P
    // naked here means it is *for sure* not yet handled (and thus not yet cached)
    const naked = input[P];
    // derivate the "total A" recursively (see `derivateA`)
    const A = derivateA(graph, P);
    // create a cached version of this node's fetch
    // It's actually create or retrieve, since if we already visited this P/node
    // to create the cached version for another node, we **must** reuse the
    // cached version previously created (in order to share the cache)
    const cachedFetch = asCached(graph, naked.fetch, P, naked.strategy);
    // in the end, we add this info to the node:
    const dress = { A, cachedFetch };

    return assign(graph, {
      [P]: assign({}, naked, dress)
    });
  }, assign({}, input));

  // this additional pass of the graph is very WIP
  // the objective here is to add "master -> slave" links
  // where a `master` is any node (any fetch) and `slaves`
  // is an array containing all the Ps belonging to the "downset" for this node
  // In other words, slaves contains all the Ps that must be invalidated when this node is.
  //
  Ps.forEach(P => {
    const master = graph[P].fetch;
    // start with an empty downset
    graph[P].slaves = [];
    Ps.forEach(PP => {
      if (PP !== P) { // skip self
        const f = graph[PP].fetch;
        if (f.type === 'composition') { // if we find a composition
          if (f.master === master) { // with this node as master
            // it means it is part of this node downset
            graph[P].slaves.push(PP);
          }
        }
        if (f.type === 'product') { // if we find a product
          if (some(f.fetches, ff => ff === master)) { // with this node among `product.fetches`
            // it means it is part of this node downset
            graph[P].slaves.push(PP);
          }
        }
      }
    });
  });

  return graph;
}
