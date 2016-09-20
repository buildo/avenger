import findKey from 'lodash/findKey';
import some from 'lodash/some';
import assign from 'lodash/assign';

// find a node key (P) by `fetch`
function findP(graph, f) {
  // returns the `P` (aka `key` of `inputOrGraph` holding the given `f` as `fetch`)
  return findKey(graph, ({ fetch }) => fetch === f);
}

function derivateA(graph, P) {
  const node = graph[P];
  return node.A || (() => {
    switch (node.fetch.type) {
      case 'composition':
        // in a composition, the "total A" is the master's A
        // https://github.com/buildo/avenger#composition
        return derivateA(graph, findP(graph, node.fetch.master));
      case 'product':
        // in a product, "total A" is [A1, ..., An]
        // https://github.com/buildo/avenger#product
        // In practice, given the "deep" array, we can easily pick and redistribute
        // the correct pieces of A when given a flat A values object
        return node.fetch.fetches.map(f => derivateA(graph, findP(graph, f)));
      default:
        // a fetch that is neither a composition or a product, **must** carry A information
        throw new Error(`missing A for naked '${P}'`);
    }
  })();
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
//      // the node (possibly cached) fetch function. Either an "atomic fetch" or a `composition` or a `product`
//      //
//      fetch,
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
// with more information that is needed at runtime
//
export function make(input) {
  const Ps = Object.keys(input);
  const graph = Ps.reduce((graph, P) => {
    // work on this "naked" (not-yet-decorated) fetch/P
    const naked = input[P];
    // derivate the "total A" recursively (see `derivateA`)
    const A = derivateA(graph, P);
    // add this info to the node:
    const dress = { A };
    return assign(graph, {
      [P]: assign({}, naked, dress)
    });
  }, assign({}, input));

  // this additional pass of the graph is very WIP
  // the objective here is to add "master -> slave" links
  // where a `master` is any node (any fetch) and `downset`
  // is an array containing all the Ps belonging to the "downset" for this node
  // In other words, downset contains all the Ps that must be invalidated when this node is.
  //
  Ps.forEach(P => {
    const master = graph[P].fetch;
    // start with an empty downset
    graph[P].downset = [];
    Ps.forEach(PP => {
      if (PP !== P) { // skip self
        const f = graph[PP].fetch;
        if (f.type === 'composition') { // if we find a composition
          if (f.master === master) { // with this node as master
            // it means it is part of this node downset
            graph[P].downset.push(PP);
          }
        }
        if (f.type === 'product') { // if we find a product
          if (some(f.fetches, ff => ff === master)) { // with this node among `product.fetches`
            // it means it is part of this node downset
            graph[P].downset.push(PP);
          }
        }
      }
    });
  });

  return graph;
}
