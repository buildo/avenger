import { TaskEither } from 'fp-ts/lib/TaskEither';
import {
  EnforceNonEmptyRecord,
  ObservableQueries,
  ProductA,
  VoidInputObservableQueries
} from './util';
import { product } from './Query';

export function invalidate<I extends VoidInputObservableQueries>(
  queries: EnforceNonEmptyRecord<I>,
  input?: ProductA<I>
): TaskEither<
  { [K in keyof I]: I[K]['_L'] }[keyof I],
  { [K in keyof I]: I[K]['_P'] }
>;
export function invalidate<I extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<I>,
  input: ProductA<I>
): TaskEither<
  { [K in keyof I]: I[K]['_L'] }[keyof I],
  { [K in keyof I]: I[K]['_P'] }
>;
export function invalidate<I extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<I>,
  input?: ProductA<I>
): TaskEither<
  { [K in keyof I]: I[K]['_L'] }[keyof I],
  { [K in keyof I]: I[K]['_P'] }
> {
  return product(queries).invalidate(input as any);
}
