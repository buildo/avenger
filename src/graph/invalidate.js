import { invalidate as _invalidate, hasObservers } from '../query/invalidate';
import { queriesAndArgs, topoSorted } from './util';

// invalidate (and refetch accordingly) `invalidatePs` for the given `A` arguments object
export function invalidate(graph, _invalidatePs, A) {
  // sorting is needed to ensure that a query is always
  // invalidated before each one of its dependencies
  // (otherwise we'd loose the data needed to invalidate the
  // dependant query, and thus fail to invalidate it)
  const invalidatePs = topoSorted(graph, _invalidatePs);
  // distribute the arguments following graph edges
  // i.e. produce `args` for each `P` that are valid for the lower level `invalidate` signature
  const { args: invalidateArgs } = queriesAndArgs(graph, invalidatePs, A);
  // actually invalidate
  invalidatePs.forEach(P => _invalidate(graph[P].fetch, invalidateArgs[P]));
  // actually refetch()
  invalidatePs
    // instead of refetching everything blindly, limit to the queries with observers
    // this is not perfect: it avoids underfetching but it just limits overfetching
    .filter(P => hasObservers(graph[P].fetch, invalidateArgs[P]))
    .forEach(P => {
      graph[P].fetch(invalidateArgs[P]);
    });
}
