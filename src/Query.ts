import { TaskEither, taskEither } from 'fp-ts/lib/TaskEither';
import { Cache } from './Cache';
import { Setoid } from 'fp-ts/lib/Setoid';
import { array } from 'fp-ts/lib/Array';

export interface Fetch<A = void, L = unknown, P = unknown> {
  (input: A): TaskEither<L, P>;
}

interface BaseQuery<A, L, P> {
  _A: A;
  _L: L;
  _P: P;
  run: (input: A) => TaskEither<L, P>;
  invalidate: (input: A) => TaskEither<L, P>;
}

function queryPhantoms<A, L, P>(): { _A: A; _L: L; _P: P } {
  return null as any;
}

interface CachedQuery<A = void, L = unknown, P = unknown>
  extends BaseQuery<A, L, P> {
  type: 'cached';
  cache: Cache<A, L, P>;
}

interface Composition<
  A1 = void,
  L1 = unknown,
  P1 = unknown,
  L2 = unknown,
  P2 = unknown
> extends BaseQuery<A1, L1 | L2, P2> {
  type: 'composition';
  master: ObservableQuery<A1, L1, P1>;
  slave: ObservableQuery<P1, L2, P2>;
}

interface Product<A = void, L = unknown, P = unknown>
  extends BaseQuery<A, L, P> {
  type: 'product';
  queries: Array<ObservableQuery<A, L, P>>;
}

export type ObservableQuery<A = void, L = unknown, P = unknown> =
  | CachedQuery<A, L, P>
  | Composition<A, L, P>
  | Product<A, L, P>;

export function query<A = void, L = unknown, P = unknown>(
  fetch: Fetch<A, L, P>,
  inputSetoid: Setoid<A>
): CachedQuery<A, L, P> {
  const cache = new Cache<A, L, P>(fetch, inputSetoid);
  return {
    type: 'cached',
    ...queryPhantoms<A, L, P>(),
    cache,
    run: cache.getOrFetch,
    invalidate: cache.invalidate
  };
}

export function compose<A1, L1, P1, L2, P2>(
  master: ObservableQuery<A1, L1, P1>,
  slave: ObservableQuery<P1, L2, P2>
): Composition<A1, L1, P1, L2, P2> {
  return {
    type: 'composition',
    ...queryPhantoms<A1, L1 | L2, P2>(),
    master,
    slave,
    run: (a1: A1) =>
      (master.run as Fetch<A1, L1 | L2, P1>)(a1).chain(a2 =>
        (slave.run as Fetch<P1, L2, P2>)(a2)
      ),
    invalidate: (a1: A1) =>
      (master.invalidate as Fetch<A1, L1 | L2, P1>)(a1).chain(a2 =>
        (slave.invalidate as Fetch<P1, L2, P2>)(a2)
      )
  };
}

export function product<
  A1 = void,
  L1 = unknown,
  P1 = unknown,
  A2 = void,
  L2 = unknown,
  P2 = unknown
>(
  f1: ObservableQuery<A1, L1, P1>,
  f2: ObservableQuery<A2, L2, P2>
): Product<[A1, A2], [L1, L2], [P1, P2]>;
export function product<
  A1 = void,
  L1 = unknown,
  P1 = unknown,
  A2 = void,
  L2 = unknown,
  P2 = unknown,
  A3 = void,
  L3 = unknown,
  P3 = unknown
>(
  f1: ObservableQuery<A1, L1, P1>,
  f2: ObservableQuery<A2, L2, P2>,
  f3: ObservableQuery<A3, L3, P3>
): Product<[A1, A2, A3], [L1, L2, L3], [P1, P2, P3]>;
export function product(
  ...queries: Array<ObservableQuery<any, any, any>>
): Product<any, any, any> {
  return {
    type: 'product',
    ...queryPhantoms<any, any, any>(),
    queries,
    run: (...as: Array<any>) =>
      array.sequence(taskEither)(queries.map((query, i) => query.run(as[i]))),
    invalidate: (...as: Array<any>) =>
      array.sequence(taskEither)(
        queries.map((query, i) => query.invalidate(as[i]))
      )
  };
}
