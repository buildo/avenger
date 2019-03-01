import { Either } from 'fp-ts/lib/Either';

export type CacheValue<L, A> =
  | CacheValuePending<L, A>
  | CacheValueResolved<L, A>
  | CacheValueError<L, A>;

class CacheValuePending<L, A> {
  readonly type: 'Pending' = 'Pending';
  readonly _A!: A;
  readonly _L!: L;
  constructor(readonly value: Promise<Either<L, A>>, readonly updated: Date) {}

  fold<R>(
    onCacheValuePending: (value: Promise<Either<L, A>>, updated: Date) => R,
    _onCacheValueError: (value: L, updated: Date) => R,
    _onCacheValueResolved: (value: A, updated: Date) => R
  ): R {
    return onCacheValuePending(this.value, this.updated);
  }
}

class CacheValueError<L, A> {
  readonly type: 'Error' = 'Error';
  readonly _A!: A;
  readonly _L!: L;
  constructor(readonly value: L, readonly updated: Date) {}

  fold<R>(
    _onCacheValuePending: (value: Promise<Either<L, A>>, updated: Date) => R,
    onCacheValueError: (value: L, updated: Date) => R,
    _onCacheValueResolved: (value: A, updated: Date) => R
  ): R {
    return onCacheValueError(this.value, this.updated);
  }
}

class CacheValueResolved<L, A> {
  readonly type: 'Resolved' = 'Resolved';
  readonly _A!: A;
  readonly _L!: L;
  constructor(readonly value: A, readonly updated: Date) {}

  fold<R>(
    _onCacheValuePending: (value: Promise<Either<L, A>>, updated: Date) => R,
    _onCacheValueError: (value: L, updated: Date) => R,
    onCacheValueResolved: (value: A, updated: Date) => R
  ): R {
    return onCacheValueResolved(this.value, this.updated);
  }
}

export function cacheValuePending<L, A>(
  value: Promise<Either<L, A>>,
  updated: Date
): CacheValue<L, A> {
  return new CacheValuePending(value, updated);
}

export function cacheValueError<L, A>(
  value: L,
  updated: Date
): CacheValue<L, A> {
  return new CacheValueError(value, updated);
}

export function cacheValueResolved<L, A>(
  value: A,
  updated: Date
): CacheValue<L, A> {
  return new CacheValueResolved(value, updated);
}
