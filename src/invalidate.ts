import { ObservableQuery, EnforceNonEmptyRecord } from './Query';
import { TaskEither, taskEither } from 'fp-ts/lib/TaskEither';
import { sequence, mapWithKey } from 'fp-ts/lib/Record';

export function invalidate<
  K extends string,
  I extends Record<K, ObservableQuery<any, any, any>>
>(
  queries: EnforceNonEmptyRecord<I>,
  input: { [k in K]: I[k]['_A'] }
): TaskEither<{ [k in K]: I[k]['_L'] }[K], { [k in K]: I[k]['_P'] }> {
  return sequence(taskEither)(
    mapWithKey(queries, (k, query) => query.invalidate(input[k]))
  );
}
