import { QueryResult, success, failure } from '../QueryResult';
import { Semigroup } from 'fp-ts/lib/Semigroup';

/**
 * A Semigroup that can be used to aggregate `QueryResult`s.
 * This is the semigroup used by default, and "keeps" the last Success or Error event,
 * meaning that you will only ever observe a single `Loading` in your component,
 * even if the query is re-run (still, `loading: boolean` is provided for the
 * `onSuccess` or `onFailure` cases).
 *
 * @returns the Semigroup
 *
 * @example
 * const S = keepQueryResultSemigroup<string, number>()
 * useQuery(randomQuery, randomQueryParams, S).fold(
 *   () => "load",
 *   () => "failed",
 *   (randomQueryResult) => randomQueryResult
 * )
 */
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

/**
 * A Semigroup that can be used to aggregate `QueryResult`s,
 * always returning the last event and ignoring the previous ones.
 *
 * @returns the Semigroup
 *
 * @example
 * const S = lastQueryResultSemigroup<string, number>()
 * useQuery(randomQuery, randomQueryParams, S).fold(
 *   () => "load",
 *   () => "failed",
 *   (randomQueryResult) => randomQueryResult
 * )
 */
export function lastQueryResultSemigroup<L, P>(): Semigroup<QueryResult<L, P>> {
  return {
    concat: (_, b) => b
  };
}
