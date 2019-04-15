import { Fetch } from './Query';
import { invalidate } from './invalidate';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import { EnforceNonEmptyRecord, ObservableQueries, ProductA } from './util';

export function command<
  A,
  L,
  P,
  I extends ObservableQueries,
  IL extends { [k in keyof I]: I[k]['_L'] }[keyof I]
>(
  cmd: Fetch<A, L, P>,
  queries: EnforceNonEmptyRecord<I>
): (a: A, ia: ProductA<I>) => TaskEither<L | IL, P> {
  return (a, ia) => cmd(a).chain(p => invalidate(queries, ia).map(() => p));
}
