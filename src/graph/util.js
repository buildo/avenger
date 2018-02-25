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
export function distributeParams(queryNodes, flatParams) {
  return Object.keys(queryNodes).reduce((argz, P) => assign(argz, {
    [P]: pickA(flatParams, queryNodes[P].A)
  }), {});
}

// e.g. if `C` depends on `B` depends on `A`
// given { A, B, C }, returns ['C', 'B', 'A'] (dependants first, root last)
export function topoSorted(queryNodes) {
  return sortBy(Object.keys(queryNodes), P => -queryNodes[P].depth);
}
