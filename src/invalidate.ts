import { TaskEither, taskEither } from 'fp-ts/lib/TaskEither';
import { sequence, mapWithKey } from 'fp-ts/lib/Record';
import {
  EnforceNonEmptyRecord,
  ObservableQueries,
  ProductA,
  VoidInputObservableQueries
} from './util';

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
  return sequence(taskEither)(
    mapWithKey(queries, (k, query) =>
      query.invalidate(((input || {}) as any)[k])
    )
  ) as any;
}
