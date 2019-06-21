import {
  EnforceNonEmptyRecord,
  ProductA,
  VoidInputCachedQueries,
  CachedQueries
} from './util';
import { mapWithKey } from 'fp-ts/lib/Record';
import { fromNullable } from 'fp-ts/lib/Option';

/**
 * Helper to invalidate a record of observable queries.
 *
 * Upond a call to `invalidate`, each `ObservableQuery` in the record is invalidated
 * at cache level and, if currently observed, re-run, yielding more events to observers.
 * @param queries A record of observable queries to invalidate
 * @param input Input for `queries`
 */
export function invalidate<I extends VoidInputCachedQueries>(
  queries: EnforceNonEmptyRecord<I>,
  input?: ProductA<I>
): void;
export function invalidate<I extends CachedQueries>(
  queries: EnforceNonEmptyRecord<I>,
  input: ProductA<I>
): void;
export function invalidate<I extends CachedQueries>(
  queries: EnforceNonEmptyRecord<I>,
  input?: ProductA<I>
): void {
  fromNullable(input).map(i =>
    mapWithKey(queries, (k, v) => v.invalidate(i[k as keyof ProductA<I>]))
  );
}
