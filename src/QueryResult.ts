import { Monad2 } from 'fp-ts/lib/Monad';
import { Bifunctor2 } from 'fp-ts/lib/Bifunctor';
import { Setoid, fromEquals } from 'fp-ts/lib/Setoid';
import { constFalse } from 'fp-ts/lib/function';

declare module 'fp-ts/lib/HKT' {
  interface URI2HKT2<L, A> {
    QueryResult: QueryResult<L, A>;
  }
}

export const URI = 'QueryResult';

export type URI = typeof URI;

/**
 * Represents a result obtained by observing a query.
 *
 * `observe` returns an observable stream of such results.
 */
export type QueryResult<L, A> = Loading<L, A> | Failure<L, A> | Success<L, A>;

export class Loading<L, A> {
  static value: QueryResult<never, never> = new Loading();
  readonly type: 'Loading' = 'Loading';
  readonly _A!: A;
  readonly _L!: L;
  readonly _URI!: URI;
  constructor() {}

  fold<R>(
    onLoading: R,
    _onFailure: (value: L, loading: boolean) => R,
    _onSuccess: (value: A, loading: boolean) => R
  ): R {
    return onLoading;
  }

  map<B>(_: (a: A) => B): QueryResult<L, B> {
    return this as any;
  }

  bimap<B, C>(
    _whenFailure: (value: L) => B,
    _whenSuccess: (value: A) => C
  ): QueryResult<B, C> {
    return this as any;
  }

  ap<B>(fab: QueryResult<L, (a: A) => B>): QueryResult<L, B> {
    return fab.fold<QueryResult<L, B>>(
      this as any, // loading
      value => new Failure<L, B>(value, true), // fab's failure
      () => this as any // loading
    );
  }

  chain<B>(_f: (value: A) => QueryResult<L, B>): QueryResult<L, B> {
    return this as any;
  }
}

export class Failure<L, A> {
  readonly type: 'Failure' = 'Failure';
  readonly _A!: A;
  readonly _L!: L;
  readonly _URI!: URI;
  constructor(readonly value: L, readonly loading: boolean) {}

  fold<R>(
    _onLoading: R,
    onFailure: (value: L, loading: boolean) => R,
    _onSuccess: (value: A, loading: boolean) => R
  ): R {
    return onFailure(this.value, this.loading);
  }

  map<B>(_: (a: A) => B): QueryResult<L, B> {
    return this as any;
  }

  bimap<B, C>(
    whenFailure: (value: L) => B,
    _whenSuccess: (value: A) => C
  ): QueryResult<B, C> {
    return new Failure<B, C>(whenFailure(this.value), this.loading);
  }

  ap<B>(fab: QueryResult<L, (a: A) => B>): QueryResult<L, B> {
    return fab.fold<QueryResult<L, B>>(
      this as any, // failure
      () => fab as any, // fab's failure
      () => this as any // failure
    );
  }

  chain<B>(_f: (value: A) => QueryResult<L, B>): QueryResult<L, B> {
    return this as any;
  }
}

export class Success<L, A> {
  readonly type: 'Success' = 'Success';
  readonly _A!: A;
  readonly _L!: L;
  readonly _URI!: URI;
  constructor(readonly value: A, readonly loading: boolean) {}

  fold<R>(
    _onLoading: R,
    _onFailure: (value: L, loading: boolean) => R,
    onSuccess: (value: A, loading: boolean) => R
  ): R {
    return onSuccess(this.value, this.loading);
  }

  map<B>(f: (a: A) => B): QueryResult<L, B> {
    return new Success(f(this.value), this.loading);
  }

  bimap<B, C>(
    _whenFailure: (value: L) => B,
    whenSuccess: (value: A) => C
  ): QueryResult<B, C> {
    return new Success<B, C>(whenSuccess(this.value), this.loading);
  }

  ap<B>(fab: QueryResult<L, (a: A) => B>): QueryResult<L, B> {
    return fab.fold<QueryResult<L, B>>(
      fab as any, // loading
      () => fab as any, // fab's failure
      value => this.map(value) // success
    );
  }

  chain<B>(f: (value: A) => QueryResult<L, B>): QueryResult<L, B> {
    return f(this.value);
  }
}

/**
 * A `Loading` `QueryResult`
 */
export const loading: QueryResult<never, never> = Loading.value;

/**
 * Constructs a `Failure` `QueryResult`
 */
export function failure<L, A>(value: L, loading: boolean): QueryResult<L, A> {
  return new Failure(value, loading);
}

/**
 * Constructs a `Success` `QueryResult`
 */
export function success<L, A>(value: A, loading: boolean): QueryResult<L, A> {
  return new Success(value, loading);
}

const map = <L, A, B>(
  fa: QueryResult<L, A>,
  f: (a: A) => B
): QueryResult<L, B> => {
  return fa.map(f);
};

const ap = <L, A, B>(
  fab: QueryResult<L, (a: A) => B>,
  fa: QueryResult<L, A>
): QueryResult<L, B> => {
  return fa.ap(fab);
};

const of = <L, A>(value: A): QueryResult<L, A> => {
  return success(value, false);
};

const bimap = <L, A, B, C>(
  fa: QueryResult<L, A>,
  l: (l: L) => B,
  r: (a: A) => C
): QueryResult<B, C> => {
  return fa.bimap(l, r);
};

const chain = <L, A, B>(
  fa: QueryResult<L, A>,
  f: (a: A) => QueryResult<L, B>
): QueryResult<L, B> => {
  return fa.chain(f);
};

export const queryResult: Bifunctor2<URI> & Monad2<URI> = {
  URI,
  map,
  ap,
  of,
  bimap,
  chain
};

export function getSetoid<L, A>(
  Sl: Setoid<L>,
  Sa: Setoid<A>
): Setoid<QueryResult<L, A>> {
  return fromEquals((a, b) =>
    a.fold(
      b.type === 'Loading',
      fa => b.fold(false, fb => Sl.equals(fa, fb), constFalse),
      sa => b.fold(false, constFalse, sb => Sa.equals(sa, sb))
    )
  );
}
