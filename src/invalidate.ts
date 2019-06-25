import {
  EnforceNonEmptyRecord,
  ProductA,
  ObservableQueries,
  VoidInputObservableQueries
} from './util';
import { mapWithKey } from 'fp-ts/lib/Record';

/**
 * Helper to invalidate a record of observable queries.
 *
 * Upond a call to `invalidate`, each `ObservableQuery` in the record is invalidated
 * at cache level and, if currently observed, re-run, yielding more events to observers.
 * @param queries A record of observable queries to invalidate
 * @param input Input for `queries`
 */
export function invalidate<I extends VoidInputObservableQueries>(
  queries: EnforceNonEmptyRecord<I>,
  input?: ProductA<I>
): void;
export function invalidate<I extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<I>,
  input: ProductA<I>
): void;
export function invalidate<I extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<I>,
  input?: ProductA<I>
): void {
  mapWithKey(queries, (k, v) =>
    v.invalidate(input ? input[k as keyof ProductA<I>] : undefined)
  );
}
