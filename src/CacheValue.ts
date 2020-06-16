import { Either } from 'fp-ts/lib/Either';
import { Eq, fromEquals } from 'fp-ts/lib/Eq';
import { constFalse, constant } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

export interface CacheValueInitial {
  readonly _tag: 'Initial';
}

export interface CacheValuePending<E, A> {
  readonly _tag: 'Pending';
  readonly pending: Promise<Either<E, A>>;
  readonly updated: Date;
}

export interface CacheValueError<E> {
  readonly _tag: 'Error';
  readonly error: E;
  readonly updated: Date;
}

export interface CacheValueResolved<A> {
  readonly _tag: 'Resolved';
  readonly resolved: A;
  readonly updated: Date;
}

/**
 * Represents a value stored in an `ObservableQuery` cache
 */
export type CacheValue<E, A> =
  | CacheValueInitial
  | CacheValuePending<E, A>
  | CacheValueError<E>
  | CacheValueResolved<A>;

/**
 * A `CacheValueInitial`
 */
export const cacheValueInitial: CacheValue<never, never> = { _tag: 'Initial' };

/**
 * Constructs a `CacheValuePending`
 */
export function cacheValuePending<E = never, A = never>(
  pending: Promise<Either<E, A>>,
  updated: Date
): CacheValue<E, A> {
  return { _tag: 'Pending', pending, updated };
}

/**
 * Constructs a `CacheValueError`
 */
export function cacheValueError<E = never, A = never>(
  error: E,
  updated: Date
): CacheValue<E, A> {
  return { _tag: 'Error', error, updated };
}

/**
 * Constructs a `CacheValueResolved`
 */
export function cacheValueResolved<E = never, A = never>(
  resolved: A,
  updated: Date
): CacheValue<E, A> {
  return { _tag: 'Resolved', resolved, updated };
}

export function fold<E, A, B>(
  onCacheValueInitial: () => B,
  onCacheValuePending: (pending: Promise<Either<E, A>>, updated: Date) => B,
  onCacheValueError: (error: E, updated: Date) => B,
  onCacheValueResolved: (resolved: A, updated: Date) => B
): (ma: CacheValue<E, A>) => B {
  return ma => {
    switch (ma._tag) {
      case 'Initial':
        return onCacheValueInitial();
      case 'Pending':
        return onCacheValuePending(ma.pending, ma.updated);
      case 'Error':
        return onCacheValueError(ma.error, ma.updated);
      case 'Resolved':
        return onCacheValueResolved(ma.resolved, ma.updated);
    }
  };
}

/**
 * Constructs the Eq instance for `CacheValue` given Eqs to compare errors and resolved values
 * @param Eqe Eq to compare error values
 * @param Eqa Eq to compare resolved values
 */
export function getEq<E, A>(Eqe: Eq<E>, Eqa: Eq<A>): Eq<CacheValue<E, A>> {
  return fromEquals((a, b) =>
    pipe(
      a,
      fold(
        constant(b._tag === 'Initial'),
        constant(b._tag === 'Pending'),
        ea =>
          pipe(
            b,
            fold(constFalse, constFalse, eb => Eqe.equals(ea, eb), constFalse)
          ),
        sa =>
          pipe(
            b,
            fold(constFalse, constFalse, constFalse, sb => Eqa.equals(sa, sb))
          )
      )
    )
  );
}
