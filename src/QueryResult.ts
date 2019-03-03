import { Applicative2 } from 'fp-ts/lib/Applicative';
import { Functor2 } from 'fp-ts/lib/Functor';

declare module 'fp-ts/lib/HKT' {
  interface URI2HKT2<L, A> {
    QueryResult: QueryResult<L, A>;
  }
}

export const URI = 'QueryResult';

export type URI = typeof URI;

export type QueryResult<L, A> = Loading<L, A> | Failure<L, A> | Success<L, A>;

export class Loading<L, A> {
  static value: QueryResult<never, never> = new Loading();
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

  map<B>(_: (a: A) => B): QueryResult<L, B> {
    return this as any;
  }

  ap<B>(fab: QueryResult<L, (a: A) => B>): QueryResult<L, B> {
    return fab.fold<QueryResult<L, B>>(
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

  map<B>(_: (a: A) => B): QueryResult<L, B> {
    return this as any;
  }

  ap<B>(fab: QueryResult<L, (a: A) => B>): QueryResult<L, B> {
    return fab.fold<QueryResult<L, B>>(
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

  map<B>(f: (a: A) => B): QueryResult<L, B> {
    return new Success(f(this.value), this.loading);
  }

  ap<B>(fab: QueryResult<L, (a: A) => B>): QueryResult<L, B> {
    return fab.fold<QueryResult<L, B>>(
      fab as any, // loading
      () => fab as any, // fab's failure. Do we want to aggregate loadings here?
      value => this.map(value) // success
    );
  }
}

export const loading: QueryResult<never, never> = Loading.value;

export function failure<L, A>(value: L, loading: boolean): QueryResult<L, A> {
  return new Failure(value, loading);
}

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

export const queryResult: Functor2<URI> & Applicative2<URI> = {
  URI,
  map,
  ap,
  of
};
