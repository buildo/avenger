import uniq from 'lodash/uniq';
import flatten from 'lodash/flatten';
import { invalidate as _invalidate } from '../query/invalidate';
import { queriesAndArgs } from './util';

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
      return uniq( // filter out useless duplicate Ps (reached more than once from different paths)
        ps.concat(P)
      );
    }
    return uniq( // filter out useless duplicate Ps (reached more than once from different paths)
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
