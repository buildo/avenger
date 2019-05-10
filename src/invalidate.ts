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
