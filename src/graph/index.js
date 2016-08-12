import t from 'tcomb';
import findKey from 'lodash/findKey';
import pick from 'lodash/pick';
import uniq from 'lodash/uniq';
import flatten from 'lodash/flatten';
import some from 'lodash/some';
import { apply } from '../query/apply';
import { invalidate as _invalidate } from '../query/invalidate';
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

// given a flat `AA` object, e.g.
//
//   { a: 3, foo: 'asd', bar: true }
//
// and an (possibly nested) `A` description, e.g.
//
//   [['a'], ['foo', 'bar']]
//
// returns an (possibly nested array containing) object(s) with the values
// corresponding to the given A keys, e.g.
//
//   [{ a: 3 }, { foo: 'asd', bar: true }]
//
function pickA(AA, A) {
  if (t.list(t.String).is(A)) { // ['foo', 'bar']
    return pick(AA, A);
  } else {                      // [['foo', 'bar'], ['foo']]
    return A.map(a => pickA(AA, a));
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

    return Object.assign(graph, {
      [P]: Object.assign({}, naked, dress)
    });
  }, Object.assign({}, input));

  // this additional pass of the graph is very WIP
  // the objective here is to add "master -> slave" links
  // where a `master` is any node (any fetch) and `slaves`
  // is an array containing all the Ps belonging to the "downset" for this node
  // In other words, slaves contains all the Ps that must be invalidated when this node is.
  //
  // DISCLAIMER: this is algoritmically very bad and dumb in general :P
  //
  console.time(); // eslint-disable-line no-console
  Ps.forEach(P => {
    const master = graph[P];
    // start with an empty downset
    master.slaves = [];
    Ps.forEach(PP => {
      if (PP !== P) { // skip self
        const f = graph[PP].fetch;
        if (f.type === 'composition') { // if we find a composition
          if (findP(graph, f.master) === P) { // with this node as master
            // it means it is part of this node downset
            master.slaves.push(PP);
          }
        }
        if (f.type === 'product') { // if we find a product
          if (some(f.fetches, ff => findP(graph, ff) === P)) { // with this node among `product.fetches`
            // it means it is part of this node downset
            master.slaves.push(PP);
          }
        }
      }
    });
  });
  // this currently takes ~8s on OD, for about 450 keys (Ps)
  console.timeEnd(); // eslint-disable-line no-console
  return graph;
}

// given an array of `Ps`, aka "query ids"
// and an object of arguments `A`
// returns the same information rearranged to match the
// lower level `apply` signature expectations
function queriesAndArgs(graph, Ps, A) {
  const queries = Ps.reduce((qs, P) => Object.assign(qs, {
    [P]: graph[P].cachedFetch || graph[P].fetch // non-atoms are not cached, we return the naked fetch
  }), {});
  const args = Ps.reduce((argz, P) => Object.assign(argz, {
    [P]: pickA(A, graph[P].A)
  }), {});
  return { queries, args };
}

// query the `graph`
// request `Ps` queries, e.g:
//
//   ['samples', 'tests']
//
// with `A` arguments, e.g:
//
//   { token: 'asdafs', sampleId: 1, testId: 2 }
//
export function query(graph, Ps, A) {
  const { queries, args } = queriesAndArgs(graph, Ps, A);
  return apply(queries, args);
}

// returns "the downset" for all the given `Ps`
// following `slaves` link (see `make`)
// always in terms of `Ps`
//
// e.g. `_refetchPs(g, ['a', 'b']) // => ['a', 'b', 'c', 'e']`
//
// the downset always contains the given `Ps`
function _refetchPs(graph, Ps) {
  return Ps.reduce((ps, P) => {
    const slaves = graph[P].slaves;
    if (slaves.length === 0) {
      // we are visiting a "leaf"
      // just add its own `P`
      return ps.concat(P);
    }
    return uniq( // filter out duplicate Ps (reached more than once from different paths)
      ps.concat(
        // recurse on all this node `slaves`
        // then flatten into a single string array
        flatten(slaves.map(p => _refetchPs(graph, [p])))
      )
    );
  }, []);
}

// invalidate (and refetch accordingly) `invalidatePs` for the given `A` arguments object
export function invalidate(graph, invalidatePs, A) {
  // gather all Ps to refetch (aka the given Ps + entire downset)
  const refetchPs = _refetchPs(graph, invalidatePs);
  // distribute the arguments following graph edges
  // i.e. produce `args` for each `P` that are valid for the lower level `invalidate` signature
  const { args: invalidateArgs } = queriesAndArgs(graph, invalidatePs, A);
  // actually invalidate (only the Ps to invalidate)
  invalidatePs.forEach(P => _invalidate(graph[P].cachedFetch, invalidateArgs[P]));
  // distribute the arguments following graph edges
  // i.e. produce `args` for each `P` that are valid for the lower level `fetch` signature
  const { args: refetchArgs } = queriesAndArgs(graph, refetchPs, A);
  // actually refetch() (all the Ps, that is `invalidatePs` + entire downset)
  refetchPs.forEach(P => (graph[P].cachedFetch || graph[P].fetch)(refetchArgs[P]));
}
