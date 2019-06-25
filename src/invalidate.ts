import { TaskEither } from 'fp-ts/lib/TaskEither';
import {
  EnforceNonEmptyRecord,
  ObservableQueries,
  ProductA,
  VoidInputObservableQueries,
  ProductL,
  ProductP
} from './util';
import { product } from './Query';

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
): TaskEither<ProductL<I>, ProductP<I>>;
export function invalidate<I extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<I>,
  input: ProductA<I>
): TaskEither<ProductL<I>, ProductP<I>>;
export function invalidate<I extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<I>,
  input?: ProductA<I>
): TaskEither<ProductL<I>, ProductP<I>> {
  return product(queries).invalidate(input as any);
}
