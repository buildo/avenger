import { Fetch } from './Query';
import { invalidate } from './invalidate';
import { TaskEither, taskEither } from 'fp-ts/lib/TaskEither';
import {
  EnforceNonEmptyRecord,
  ObservableQueries,
  ProductA,
  VoidInputObservableQueries,
  ProductL
} from './util';

export function command<
  A,
  L,
  P,
  I extends VoidInputObservableQueries,
  IL extends ProductL<I>
>(
  cmd: Fetch<A, L, P>,
  queries: EnforceNonEmptyRecord<I>
): (a: A, ia?: ProductA<I>) => TaskEither<L | IL, P>;
export function command<
  A,
  L,
  P,
  I extends ObservableQueries,
  IL extends ProductL<I>
>(
  cmd: Fetch<A, L, P>,
  queries: EnforceNonEmptyRecord<I>
): (a: A, ia: ProductA<I>) => TaskEither<L | IL, P>;
export function command<A, L, P>(
  cmd: Fetch<A, L, P>,
  queries?: never
): (a: A, ia?: never) => TaskEither<L, P>;
export function command<A, L, P>(
  cmd: Fetch<A, L, P>,
  queries?: never
): (a: A, ia?: never) => TaskEither<L, P>;
export function command<
  A,
  L,
  P,
  I extends ObservableQueries,
  IL extends ProductL<I>
>(
  cmd: Fetch<A, L, P>,
  queries?: EnforceNonEmptyRecord<I>
): (a: A, ia?: ProductA<I>) => TaskEither<L | IL, P> {
  return (a, ia) =>
    cmd(a).chain(p =>
      queries
        ? invalidate(queries, (ia || {}) as any).map(() => p)
        : taskEither.of<L, P>(p)
    );
}

export function contramap<U, L, A, B>(
  fa: (a: U) => TaskEither<L, A>,
  f: (a: B) => U
): (a: B) => TaskEither<L, A> {
  return a => fa(f(a));
}
