import { Fetch } from './Query';
import { invalidate } from './invalidate';
import * as TE from 'fp-ts/lib/TaskEither';
import {
  EnforceNonEmptyRecord,
  ProductA,
  ProductL,
  ObservableQueries,
  VoidInputObservableQueries
} from './util';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

/**
 * Constructs a command,
 * that is an asynchrnous action that is typically non-idempotent and yields no results.
 * A command, when successful, can invalidate a set of queries,
 * typically used to read the updated results of the command request.
 * @param cmd The asynchronous and possibly failing action
 * @param queries An optional record of queries to invalidate upon success of `cmd`
 */
export function command<
  A,
  L,
  P,
  I extends VoidInputObservableQueries,
  IL extends ProductL<I>
>(
  cmd: Fetch<A, L, P>,
  queries: EnforceNonEmptyRecord<I>
): (a: A, ia?: ProductA<I>) => TE.TaskEither<L | IL, P>;
export function command<
  A,
  L,
  P,
  I extends ObservableQueries,
  IL extends ProductL<I>
>(
  cmd: Fetch<A, L, P>,
  queries: EnforceNonEmptyRecord<I>
): (a: A, ia: ProductA<I>) => TE.TaskEither<L | IL, P>;
export function command<A, L, P>(
  cmd: Fetch<A, L, P>,
  queries?: never
): (a: A, ia?: never) => TE.TaskEither<L, P>;
export function command<A, L, P>(
  cmd: Fetch<A, L, P>,
  queries?: never
): (a: A, ia?: never) => TE.TaskEither<L, P>;
export function command<
  A,
  L,
  P,
  I extends ObservableQueries,
  IL extends ProductL<I>
>(
  cmd: Fetch<A, L, P>,
  queries?: EnforceNonEmptyRecord<I>
): (a: A, ia?: ProductA<I>) => TE.TaskEither<L | IL, P> {
  return (a, ia) =>
    TE.taskEither.chain(cmd(a), p =>
      pipe(
        queries,
        O.fromNullable,
        O.fold(
          () => TE.taskEither.of(p),
          queries =>
            TE.taskEither.map(
              invalidate((queries as unknown) as EnforceNonEmptyRecord<I>, ia),
              () => p
            )
        )
      )
    );
}

export function contramap<U, L, A, B>(
  fa: (a: U) => TE.TaskEither<L, A>,
  f: (a: B) => U
): (a: B) => TE.TaskEither<L, A> {
  return a => fa(f(a));
}
