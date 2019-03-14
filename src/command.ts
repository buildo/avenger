import { invalidate } from './invalidate';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import { Query } from './Query';
import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither';

export function command<
  A,
  L,
  P,
  I extends Record<string, Query<any, any, any>>,
  IL extends { [k in keyof I]: I[k]['_L'] }[keyof I],
  IA extends { [k in keyof I]: I[k]['_A'] }
>(
  cmd: ReaderTaskEither<A, L, P>,
  queries: I
): (a: A, ia: IA) => TaskEither<L | IL, P> {
  return (a, ia) =>
    cmd.value(a).chain(p => invalidate(queries, ia).map(() => p));
}
