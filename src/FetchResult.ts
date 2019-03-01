import { Applicative2 } from 'fp-ts/lib/Applicative';
import { Functor2 } from 'fp-ts/lib/Functor';

declare module 'fp-ts/lib/HKT' {
  interface URI2HKT2<L, A> {
    FetchResult: FetchResult<L, A>;
  }
}

export const URI = 'FetchResult';

export type URI = typeof URI;

export type FetchResult<L, A> = Loading<L, A> | Failure<L, A> | Success<L, A>;

export class Loading<L, A> {
  static value: FetchResult<never, never> = new Loading();
  readonly type: 'Loading' = 'Loading';
  readonly _A!: A;
  readonly _L!: L;
  readonly _URI!: URI;
  private constructor() {}

  fold<R>(
    onLoading: R,
    _onFailure: (value: L, loading: boolean) => R,
    _onSuccess: (value: A, loading: boolean) => R
  ): R {
    return onLoading;
  }

  map<B>(_: (a: A) => B): FetchResult<L, B> {
    return this as any;
  }

  ap<B>(fab: FetchResult<L, (a: A) => B>): FetchResult<L, B> {
    return fab.fold<FetchResult<L, B>>(
      this as any, // loading
      () => fab as any, // failure. Do we want to aggregate loadings here?
      () => this as any // loading
    );
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

  map<B>(_: (a: A) => B): FetchResult<L, B> {
    return this as any;
  }

  ap<B>(fab: FetchResult<L, (a: A) => B>): FetchResult<L, B> {
    return fab.fold<FetchResult<L, B>>(
      this as any, // failure
      () => fab as any, // fab's failure. Do we want to aggregate loadings here?
      () => this as any // failure
    );
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

  map<B>(f: (a: A) => B): FetchResult<L, B> {
    return new Success(f(this.value), this.loading);
  }

  ap<B>(fab: FetchResult<L, (a: A) => B>): FetchResult<L, B> {
    return fab.fold<FetchResult<L, B>>(
      fab as any, // loading
      () => fab as any, // fab's failure. Do we want to aggregate loadings here?
      value => this.map(value) // success
    );
  }
}

export const loading: FetchResult<never, never> = Loading.value;

export function failure<L, A>(value: L, loading: boolean): FetchResult<L, A> {
  return new Failure(value, loading);
}

export function success<L, A>(value: A, loading: boolean): FetchResult<L, A> {
  return new Success(value, loading);
}

const map = <L, A, B>(
  fa: FetchResult<L, A>,
  f: (a: A) => B
): FetchResult<L, B> => {
  return fa.map(f);
};

const ap = <L, A, B>(
  fab: FetchResult<L, (a: A) => B>,
  fa: FetchResult<L, A>
): FetchResult<L, B> => {
  return fa.ap(fab);
};

const of = <L, A>(value: A): FetchResult<L, A> => {
  return success(value, false);
};

export const fetchResult: Functor2<URI> & Applicative2<URI> = {
  URI,
  map,
  ap,
  of
};
