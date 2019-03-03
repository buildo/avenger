import { TaskEither } from 'fp-ts/lib/TaskEither';
import { Cache } from './Cache';
import { Setoid } from 'fp-ts/lib/Setoid';

export interface Fetch<A = void, L = unknown, P = unknown> {
  (input: A): TaskEither<L, P>;
}

interface BaseQuery<A, P> {
  run: (input: A) => Promise<P>;
}

interface CachedQuery<A = void, L = unknown, P = unknown>
  extends BaseQuery<A, P> {
  type: 'cached';
  cache: Cache<A, L, P>;
}

interface Composition<
  A1 = void,
  L1 = unknown,
  P1 = unknown,
  L2 = unknown,
  P2 = unknown
> extends BaseQuery<A1, P2> {
  type: 'composition';
  master: ObservableQuery<A1, L1, P1>;
  slave: ObservableQuery<P1, L2, P2>;
}

interface Product<A = void, L = unknown, P = unknown> extends BaseQuery<A, P> {
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
    cache,
    run: cache.getOrFetch
  };
}

export function compose<A1, L1, P1, L2, P2>(
  master: ObservableQuery<A1, L1, P1>,
  slave: ObservableQuery<P1, L2, P2>
): Composition<A1, L1, P1, L2, P2> {
  return {
    type: 'composition',
    master,
    slave,
    // @ts-ignore
    run: (a1: A1) => master.run(a1).then(a2 => slave.run(a2))
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
    queries,
    run: (...as: Array<any>) =>
      Promise.all(queries.map((query, i) => query.run(as[i])))
  };
}
