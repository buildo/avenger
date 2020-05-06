import { QueryResult, success, failure } from '../QueryResult';
import { Semigroup } from 'fp-ts/lib/Semigroup';

export function keepQueryResultSemigroup<L, P>(): Semigroup<QueryResult<L, P>> {
  return {
    concat: (a, b) =>
      a.type === 'Success' && b.type === 'Loading'
        ? success(a.value, true)
        : a.type === 'Failure' && b.type === 'Loading'
        ? failure(a.value, true)
        : b
  };
}

export function lastQueryResultSemigroup<L, P>(): Semigroup<QueryResult<L, P>> {
  return {
    concat: (_, b) => b
  };
}
