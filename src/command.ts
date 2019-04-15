import { Fetch, ObservableQuery } from './Query';
import { invalidate } from './invalidate';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import { EnforceNonEmptyRecord } from './util';

export function command<
  A,
  L,
  P,
  I extends Record<string, ObservableQuery<any, any, any>>,
  IL extends { [k in keyof I]: I[k]['_L'] }[keyof I],
  IA extends { [k in keyof I]: I[k]['_A'] }
>(
  cmd: Fetch<A, L, P>,
  queries: EnforceNonEmptyRecord<I>
): (a: A, ia: IA) => TaskEither<L | IL, P> {
  return (a, ia) => cmd(a).chain(p => invalidate(queries, ia).map(() => p));
}
