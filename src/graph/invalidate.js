import { invalidate as _invalidate, hasObservers } from '../query/invalidate';
import { queriesAndArgs } from './util';

// invalidate (and refetch accordingly) `invalidatePs` for the given `A` arguments object
export function invalidate(graph, invalidatePs, A) {
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
