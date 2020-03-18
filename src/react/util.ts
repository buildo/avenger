import { QueryResult, loading, success } from '../QueryResult';

export function defaultMonoidResult<L, P>() {
  return {
    empty: loading,
    concat: (a: QueryResult<L, P>, b: QueryResult<L, P>) =>
      a.type === 'Success' && b.type === 'Loading'
        ? success<L, P>(a.value, true)
        : b
  };
}
