import { Monad2 } from 'fp-ts/lib/Monad';
import { Bifunctor2 } from 'fp-ts/lib/Bifunctor';
import { Alt2 } from 'fp-ts/lib/Alt';
import * as Eq from 'fp-ts/lib/Eq';
import { constFalse, constant } from 'fp-ts/lib/function';
import { pipeable, pipe } from 'fp-ts/lib/pipeable';

declare module 'fp-ts/lib/HKT' {
  interface URItoKind2<E, A> {
    QueryResult: QueryResult<E, A>;
  }
}

export const URI = 'QueryResult';

export type URI = typeof URI;

export interface QueryResultLoading {
  readonly _tag: 'Loading';
}

export interface QueryResultFailure<E> {
  readonly _tag: 'Failure';
  readonly failure: E;
  readonly loading: boolean;
}

export interface QueryResultSuccess<A> {
  readonly _tag: 'Success';
  readonly success: A;
  readonly loading: boolean;
}

/**
 * Represents a result obtained by observing a query.
 *
 * `observe` returns an observable stream of such results.
 */
export type QueryResult<E, A> =
  | QueryResultLoading
  | QueryResultFailure<E>
  | QueryResultSuccess<A>;

/**
 * A `QueryResultLoading`
 */
export const queryResultLoading: QueryResult<never, never> = {
  _tag: 'Loading'
};

/**
 * Constructs a `QueryResultFailure`
 */
export function queryResultFailure<E = never, A = never>(
  failure: E,
  loading: boolean
): QueryResult<E, A> {
  return { _tag: 'Failure', failure, loading };
}

/**
 * Constructs a `QueryResultSuccess`
 */
export function queryResultSuccess<E = never, A = never>(
  success: A,
  loading: boolean
): QueryResult<E, A> {
  return { _tag: 'Success', success, loading };
}

export function fold<E, A, B>(
  onLoading: () => B,
  onFailure: (failure: E, loading: boolean) => B,
  onSuccess: (success: A, loading: boolean) => B
): (ma: QueryResult<E, A>) => B {
  return ma => {
    switch (ma._tag) {
      case 'Loading':
        return onLoading();
      case 'Failure':
        return onFailure(ma.failure, ma.loading);
      case 'Success':
        return onSuccess(ma.success, ma.loading);
    }
  };
}

function _map<E = never, A = never, B = never>(
  fa: QueryResult<E, A>,
  f: (a: A) => B
): QueryResult<E, B> {
  return pipe(
    fa,
    fold(constant(queryResultLoading), queryResultFailure, (success, loading) =>
      queryResultSuccess(f(success), loading)
    )
  );
}

function _of<E = never, A = never>(success: A): QueryResult<E, A> {
  return queryResultSuccess(success, false);
}

function _mapLeft<E = never, A = never, B = never>(
  fa: QueryResult<E, A>,
  l: (l: E) => B
): QueryResult<B, A> {
  return pipe(
    fa,
    fold(
      constant(queryResultLoading),
      (failure, loading) => queryResultFailure<B, A>(l(failure), loading),
      queryResultSuccess
    )
  );
}

function _bimap<E = never, A = never, B = never, C = never>(
  fa: QueryResult<E, A>,
  l: (l: E) => B,
  r: (a: A) => C
): QueryResult<B, C> {
  return pipe(
    fa,
    fold(
      constant(queryResultLoading),
      (failure, loading) => queryResultFailure(l(failure), loading),
      (success, loading) => queryResultSuccess(r(success), loading)
    )
  );
}

function _chain<L, A, B>(
  fa: QueryResult<L, A>,
  f: (a: A) => QueryResult<L, B>
): QueryResult<L, B> {
  return pipe(fa, fold(constant(queryResultLoading), queryResultFailure, f));
}

function _alt<E, A>(
  fx: QueryResult<E, A>,
  fy: () => QueryResult<E, A>
): QueryResult<E, A> {
  return pipe(fx, fold(fy, fy, queryResultSuccess));
}

export const queryResult: Bifunctor2<URI> & Monad2<URI> & Alt2<URI> = {
  URI,
  map: _map,
  ap: (fab, fa) => _chain(fab, f => _map(fa, f)),
  of: _of,
  mapLeft: _mapLeft,
  bimap: _bimap,
  chain: _chain,
  alt: _alt
};

const {
  ap,
  apFirst,
  apSecond,
  bimap,
  chain,
  chainFirst,
  flatten,
  map,
  mapLeft
} = pipeable(queryResult);

export {
  ap,
  apFirst,
  apSecond,
  bimap,
  chain,
  chainFirst,
  flatten,
  map,
  mapLeft
};

export function getEq<E, A>(
  Eqe: Eq.Eq<E>,
  Eqa: Eq.Eq<A>
): Eq.Eq<QueryResult<E, A>> {
  return Eq.fromEquals((a, b) =>
    pipe(
      a,
      fold(
        () => b._tag === 'Loading',
        fa =>
          pipe(
            b,
            fold(constFalse, fb => Eqe.equals(fa, fb), constFalse)
          ),
        sa =>
          pipe(
            b,
            fold(constFalse, constFalse, sb => Eqa.equals(sa, sb))
          )
      )
    )
  );
}
