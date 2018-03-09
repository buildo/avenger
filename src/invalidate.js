import { invalidate as _invalidate, hasObservers } from './query/invalidate';
import { distributeParams, topoSorted } from './util';

// invalidate (and refetch accordingly) all `queryNodes` for the given `flatParams` arguments object
export function invalidate(queryNodes, flatParams) {
  // sorting is needed to ensure that a query is always
  // invalidated before each one of its dependencies
  // (otherwise we'd loose the data needed to invalidate the
  // dependant query, and thus fail to invalidate it)
  const invalidatePs = topoSorted(queryNodes);
  // distribute the arguments following query nodes recursively
  // i.e. produce `args` for each `P` that are valid for the lower level `invalidate` signature
  const invalidateArgs = distributeParams(queryNodes, flatParams);
  // actually invalidate
  invalidatePs.forEach(P => _invalidate(queryNodes[P].fetch, invalidateArgs[P]));
  // actually refetch()
  invalidatePs
    // instead of refetching everything blindly, limit to the queries with observers
    // this is not perfect: it avoids underfetching but it just limits overfetching
    .filter(P => hasObservers(queryNodes[P].fetch, invalidateArgs[P]))
    .forEach(P => {
      queryNodes[P].fetch(invalidateArgs[P]);
    });
}
