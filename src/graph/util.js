import * as t from 'io-ts';
import pick from 'lodash/pick';
import assign from 'lodash/assign';
import findKey from 'lodash/findKey';
import sortBy from 'lodash/sortBy';

export function flatGraph(graph) {
  return Object.keys(graph).reduce((g, k) => ({
    ...g,
    [k]: graph[k],
    ...(graph[k].childNodes || {})
  }), {});
}

export function findP(graph, fetch) {
  return findKey(graph, { fetch });
}

function derivateA(graph, P) {
  const node = graph[P];
  node.A = node.A || (() => {
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
  return node.A;
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
  if (t.array(t.string).is(A)) {  // ['foo', 'bar']
    return pick(AA, A);
  } else {                        // [['foo', 'bar'], ['foo']]
    return A.map(a => pickA(AA, a));
  }
}

// given an array of `Ps`, aka "query ids"
// and an object of arguments `A`
// returns the same information rearranged to match the
// lower level `apply` signature expectations
export function queriesAndArgs(graph, Ps, A) {
  const queries = Ps.reduce((qs, P) => assign(qs, {
    [P]: graph[P].cachedFetch || graph[P].fetch // non-atoms are not cached, we return the naked fetch
  }), {});
  const args = Ps.reduce((argz, P) => assign(argz, {
    [P]: pickA(A, derivateA(graph, P))
  }), {});
  return { queries, args };
}

// e.g. if `C` depends on `B` depends on `A`
// given ['A', 'B', 'C'] in any order, returns ['C', 'B', 'A'] (dependants first, root last)
export function topoSorted(graph, Ps) {
  return sortBy(Ps, P => -graph[graph[P].compound].depth);
}
