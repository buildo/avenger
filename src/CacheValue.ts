import { Either } from 'fp-ts/lib/Either';
import { Functor2 } from 'fp-ts/lib/Functor';
import { Setoid, fromEquals } from 'fp-ts/lib/Setoid';
import { constFalse, constant } from 'fp-ts/lib/function';

declare module 'fp-ts/lib/HKT' {
  interface URI2HKT2<L, A> {
    CacheValue: CacheValue<L, A>;
  }
}

export const URI = 'CacheValue';

export type URI = typeof URI;

/**
 * Represents a value stored in an `ObservableQuery` cache
 */
export type CacheValue<L, A> =
  | CacheValueInitial<L, A>
  | CacheValuePending<L, A>
  | CacheValueResolved<L, A>
  | CacheValueError<L, A>;

class CacheValueInitial<L, A> {
  readonly type: 'Initial' = 'Initial';
  readonly _A!: A;
  readonly _L!: L;
  readonly _URI!: URI;
  constructor() {}

  fold<R>(
    onCacheValueInitial: () => R,
    _onCacheValuePending: (value: Promise<Either<L, A>>, updated: Date) => R,
    _onCacheValueError: (value: L, updated: Date) => R,
    _onCacheValueResolved: (value: A, updated: Date) => R
  ): R {
    return onCacheValueInitial();
  }

  map<B>(_f: (a: A) => B): CacheValue<L, B> {
    return this as any;
  }
}

class CacheValuePending<L, A> {
  readonly type: 'Pending' = 'Pending';
  readonly _A!: A;
  readonly _L!: L;
  readonly _URI!: URI;
  constructor(readonly value: Promise<Either<L, A>>, readonly updated: Date) {}

  fold<R>(
    _onCacheValueInitial: () => R,
    onCacheValuePending: (value: Promise<Either<L, A>>, updated: Date) => R,
    _onCacheValueError: (value: L, updated: Date) => R,
    _onCacheValueResolved: (value: A, updated: Date) => R
  ): R {
    return onCacheValuePending(this.value, this.updated);
  }

  map<B>(_f: (a: A) => B): CacheValue<L, B> {
    return this as any;
  }
}

class CacheValueError<L, A> {
  readonly type: 'Error' = 'Error';
  readonly _A!: A;
  readonly _L!: L;
  readonly _URI!: URI;
  constructor(readonly value: L, readonly updated: Date) {}

  fold<R>(
    _onCacheValueInitial: () => R,
    _onCacheValuePending: (value: Promise<Either<L, A>>, updated: Date) => R,
    onCacheValueError: (value: L, updated: Date) => R,
    _onCacheValueResolved: (value: A, updated: Date) => R
  ): R {
    return onCacheValueError(this.value, this.updated);
  }

  map<B>(_f: (a: A) => B): CacheValue<L, B> {
    return this as any;
  }
}

class CacheValueResolved<L, A> {
  readonly type: 'Resolved' = 'Resolved';
  readonly _A!: A;
  readonly _L!: L;
  readonly _URI!: URI;
  constructor(readonly value: A, readonly updated: Date) {}

  fold<R>(
    _onCacheValueInitial: () => R,
    _onCacheValuePending: (value: Promise<Either<L, A>>, updated: Date) => R,
    _onCacheValueError: (value: L, updated: Date) => R,
    onCacheValueResolved: (value: A, updated: Date) => R
  ): R {
    return onCacheValueResolved(this.value, this.updated);
  }

  map<B>(f: (a: A) => B): CacheValue<L, B> {
    return cacheValueResolved(f(this.value), this.updated);
  }
}

/**
 * Constructs a `CacheValueInitial`
 */
export function cacheValueInitial<L, A>(): CacheValue<L, A> {
  return new CacheValueInitial();
}

/**
 * Constructs a `CacheValuePending`
 */
export function cacheValuePending<L, A>(
  value: Promise<Either<L, A>>,
  updated: Date
): CacheValue<L, A> {
  return new CacheValuePending(value, updated);
}

/**
 * Constructs a `CacheValueError`
 */
export function cacheValueError<L, A>(
  value: L,
  updated: Date
): CacheValue<L, A> {
  return new CacheValueError(value, updated);
}

/**
 * Constructs a `CacheValueResolved`
 */
export function cacheValueResolved<L, A>(
  value: A,
  updated: Date
): CacheValue<L, A> {
  return new CacheValueResolved(value, updated);
}

function map<L, A, B>(fa: CacheValue<L, A>, f: (a: A) => B): CacheValue<L, B> {
  return fa.map(f);
}

export const cacheValue: Functor2<URI> = {
  URI,
  map
};

/**
 * Constructs the Setoid for `CacheValue` given Setoids to compare errors and resolved values
 * @param Sl Setoid to compare error values
 * @param Sa Setoid to compare resolved values
 */
export function getSetoid<L, A>(
  Sl: Setoid<L>,
  Sa: Setoid<A>
): Setoid<CacheValue<L, A>> {
  return fromEquals((a, b) =>
    a.fold(
      constant(b.type === 'Initial'),
      constant(b.type === 'Pending'),
      ea => b.fold(constFalse, constFalse, eb => Sl.equals(ea, eb), constFalse),
      sa => b.fold(constFalse, constFalse, constFalse, sb => Sa.equals(sa, sb))
    )
  );
}
