import { QueryResult, success, failure } from '../QueryResult';

export function keepQueryResultSemigroup<L, P>() {
  return {
    concat: (a: QueryResult<L, P>, b: QueryResult<L, P>) =>
      a.type === 'Success' && b.type === 'Loading'
        ? success<L, P>(a.value, true)
        : a.type === 'Failure' && b.type === 'Loading'
        ? failure<L, P>(a.value, true)
        : b
  };
}

export function lastQueryResultSemigroup<L, P>() {
  return {
    concat: (_: QueryResult<L, P>, b: QueryResult<L, P>) => b
  };
}
