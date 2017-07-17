import t from 'tcomb';
import pick from 'lodash/pick';
import assign from 'lodash/assign';
import findKey from 'lodash/findKey';
import sortBy from 'lodash/sortBy';

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

// given an array of `Ps`, aka "query ids"
// and an object of arguments `A`
// returns the same information rearranged to match the
// lower level `apply` signature expectations
export function queriesAndArgs(graph, Ps, A) {
  const queries = Ps.reduce((qs, P) => assign(qs, {
    [P]: graph[P].cachedFetch || graph[P].fetch // non-atoms are not cached, we return the naked fetch
  }), {});
  const args = Ps.reduce((argz, P) => assign(argz, {
    [P]: pickA(A, graph[P].A)
  }), {});
  return { queries, args };
}

export function findP(graph, fetch) {
  return findKey(graph, { fetch });
}

// e.g. if `C` depends on `B` depends on `A`
// given ['A', 'B', 'C'] in any order, returns ['C', 'B', 'A'] (dependants first, root last)
export function topoSorted(graph, Ps) {
  return sortBy(Ps, P => -graph[graph[P].compound].depth);
}
