import { Fetch } from './Fetch';
import { Cache } from './Cache';
import { identity } from 'fp-ts/lib/function';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { array } from 'fp-ts/lib/Array';
import { Strategy, refetch } from './Strategy';
import { CacheValue } from './CacheValue';
import {
  FetchResult,
  loading,
  failure,
  success,
  fetchResult
} from './FetchResult';
import { of, Observable, combineLatest } from 'rxjs';
import { distinctUntilChanged, switchMap, map } from 'rxjs/operators';

export interface ObservableFetch<A, L, P> extends Fetch<A, L, P> {
  cache: Cache<A, L, P>;
}

interface Composition<A1, L1, P1, A2, L2, P2> extends Fetch<A1, L1 | L2, P2> {
  master: ObservableFetch<A1, L1, P1>;
  slave: ObservableFetch<A2, L2, P2>;
  ptoa: (p: P1) => A2;
}

function isComposition<A1, L1, P1, A2, L2, P2>(
  fetch: Fetch<A1, L1 | L2, P2>
): fetch is Composition<A1, L1, P1, A2, L2, P2> {
  return (
    typeof (fetch as any).master === 'function' &&
    typeof (fetch as any).slave === 'function' &&
    typeof (fetch as any).ptoa === 'function'
  );
}

export function compose<A1, L1, P1, L2, P2>(
  master: ObservableFetch<A1, L1, P1>,
  slave: ObservableFetch<P1, L2, P2>
): Composition<A1, L1, P1, P1, L2, P2>;
export function compose<A1, L1, P1, A2, L2, P2>(
  master: ObservableFetch<A1, L1, P1>,
  slave: ObservableFetch<A2, L2, P2>,
  ptoa: (p: P1) => A2
): Composition<A1, L1, P1, A2, L2, P2>;
export function compose(
  master: ObservableFetch<any, any, any>,
  slave: ObservableFetch<any, any, any>,
  ptoa = identity
): Composition<any, any, any, any, any, any> {
  const composition = (a1: any) =>
    master(a1)
      .map(ptoa)
      .chain(slave);
  composition.master = master;
  composition.slave = slave;
  composition.ptoa = ptoa;
  return composition;
}

interface Product<A, L, P> extends Fetch<A, L, P> {
  fetches: Array<ObservableFetch<any, any, any>>;
}

function isProduct<A, L, P>(fetch: Fetch<A, L, P>): fetch is Product<A, L, P> {
  return (
    typeof (fetch as any).fetches === 'object' &&
    (fetch as any).fetches.length > 0
  );
}

export function product<A1, L1, P1, A2, L2, P2>(
  f1: ObservableFetch<A1, L1, P1>,
  f2: ObservableFetch<A2, L2, P2>
): Product<[A1, A2], [L1, L2], [P1, P2]>;
export function product<A1, L1, P1, A2, L2, P2, A3, L3, P3>(
  f1: ObservableFetch<A1, L1, P1>,
  f2: ObservableFetch<A2, L2, P2>,
  f3: ObservableFetch<A3, L3, P3>
): Product<[A1, A2, A3], [L1, L2, L3], [P1, P2, P3]>;
export function product<A, L, P>(...fetches: Array<ObservableFetch<A, L, P>>) {
  const product = (as: any) =>
    array.sequence(taskEither)(fetches.map((f, i) => f(as[i])));
  product.fetches = fetches;
  return product;
}

export function cache<A = undefined, L = unknown, P = unknown>(
  fetch: Fetch<A, L, P>,
  strategy: Strategy<A, L, P> = refetch
): ObservableFetch<A, L, P> {
  const cache = new Cache(fetch, strategy);
  const cachedFetch: Fetch<A, L, P> = params => cache.getOrFetch(params);
  (cachedFetch as any).cache = cache;
  return cachedFetch as any;
}

function cacheValueToFetchResult<L, P>(
  cacheValue: CacheValue<L, P>
): FetchResult<L, P> {
  return cacheValue.fold(
    () => loading,
    value => failure<L, P>(value, false),
    value => success<L, P>(value, false)
  );
}

const rxLoading = of(loading);
const rxSkipDuplicateLoadings = distinctUntilChanged<FetchResult<any, any>>(
  (fra, frb) => fra.type === 'Loading' && frb.type === 'Loading'
);

export function observe<A1, L1, P1, A2, L2, P2>(
  fetch: Composition<A1, L1, P1, A2, L2, P2>,
  params: A1
): Observable<FetchResult<L1 | L2, P2>>;
export function observe<A1, L1, P1, A2, L2, P2>(
  fetch: Product<[A1, A2], [L1, L2], [P1, P2]>,
  params: [A1, A2]
): Observable<FetchResult<[L1, L2], [P1, P2]>>;
export function observe<A, L, P>(
  fetch: ObservableFetch<A, L, P>,
  params: A
): Observable<FetchResult<L, P>>;
export function observe(
  fetch:
    | ObservableFetch<any, any, any>
    | Composition<any, any, any, any, any, any>
    | Product<any, any, any>,
  params: any
): Observable<FetchResult<any, any>> {
  if (isComposition(fetch)) {
    return observe(fetch.master, params).pipe(
      switchMap(master =>
        master.fold(
          rxLoading,
          error => of(failure(error, false)),
          value => observe(fetch.slave, fetch.ptoa(value))
        )
      ),
      rxSkipDuplicateLoadings
    );
  }

  if (isProduct(fetch)) {
    return combineLatest(
      fetch.fetches.map((fetch, i) => observe(fetch, params[i]))
    ).pipe(
      map(array.sequence(fetchResult)),
      rxSkipDuplicateLoadings
    );
  }

  return ((fetch as any) as ObservableFetch<any, any, any>).cache
    .observe(params)
    .pipe(
      map(cacheValueToFetchResult),
      rxSkipDuplicateLoadings
    );
}
