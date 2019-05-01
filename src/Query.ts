import { TaskEither, taskEither } from 'fp-ts/lib/TaskEither';
import { Cache } from './Cache';
import { mapWithKey, sequence, map } from 'fp-ts/lib/Record';
import {
  Strategy,
  JSON,
  setoidStrict,
  setoidShallow,
  setoidJSON
} from './Strategy';
import { Setoid } from 'fp-ts/lib/Setoid';
import { CacheValue, getSetoid } from './CacheValue';
import { EnforceNonEmptyRecord, ObservableQueries, ProductA } from './util';

export type Fetch<A, L, P> = (input: A) => TaskEither<L, P>;

interface BaseQuery<A, L, P> {
  _A: A;
  _L: L;
  _P: P;
  run: (input: A) => TaskEither<L, P>;
  invalidate: (input: A) => TaskEither<L, P>;
  gc: () => void;
}

function queryPhantoms<A, L, P>(): { _A: A; _L: L; _P: P } {
  return null as any;
}

export interface CachedQuery<A, L, P> extends BaseQuery<A, L, P> {
  type: 'cached';
  cache: Cache<A, L, P>;
}

export interface Composition<A, L, P> extends BaseQuery<A, L, P> {
  type: 'composition';
  master: ObservableQuery<A, L, unknown>;
  slave: ObservableQuery<unknown, L, P>;
}

export interface Product<A, L, P> extends BaseQuery<A, L, P> {
  type: 'product';
  queries: Record<string, ObservableQuery<A[keyof A], L, P[keyof P]>>;
}

export type ObservableQuery<A, L, P> =
  | CachedQuery<A, L, P>
  | Composition<A, L, P>
  | Product<A, L, P>;

export function query<A = void, L = unknown, P = unknown>(
  fetch: Fetch<A, L, P>
): (strategy: Strategy<A, L, P>) => CachedQuery<A, L, P> {
  return strategy => {
    const cache = new Cache<A, L, P>(fetch, strategy);
    return {
      type: 'cached',
      ...queryPhantoms<A, L, P>(),
      cache,
      run: cache.getOrFetch,
      invalidate: cache.invalidate,
      gc: cache.gc
    };
  };
}

export type MakeStrategy<A, L, P> = (
  inputSetoid: Setoid<A>,
  cacheValueSetoid: Setoid<CacheValue<L, P>>
) => Strategy<A, L, P>;

export function queryStrict<A = void, L = unknown, P = unknown>(
  fetch: Fetch<A, L, P>,
  makeStrategy: MakeStrategy<A, L, P>
): CachedQuery<A, L, P> {
  return query(fetch)(
    makeStrategy(setoidStrict, getSetoid(setoidStrict, setoidStrict))
  );
}

export function queryShallow<A = void, L = unknown, P = unknown>(
  fetch: Fetch<A, L, P>,
  makeStrategy: MakeStrategy<A, L, P>
): CachedQuery<A, L, P> {
  return query(fetch)(
    makeStrategy(setoidShallow, getSetoid(setoidShallow, setoidShallow))
  );
}

export function queryJSON<A extends JSON, L extends JSON, P extends JSON>(
  fetch: Fetch<A, L, P>,
  makeStrategy: MakeStrategy<A, L, P>
): CachedQuery<A, L, P> {
  return query(fetch)(
    makeStrategy(setoidJSON, getSetoid(setoidJSON, setoidJSON))
  );
}

export function compose<A1, L1, P1, L2, P2>(
  master: ObservableQuery<A1, L1, P1>,
  slave: ObservableQuery<P1, L2, P2>
): Composition<A1, L1 | L2, P2> {
  return {
    type: 'composition',
    ...queryPhantoms<A1, L1 | L2, P2>(),
    master: master as ObservableQuery<A1, L1 | L2, unknown>,
    slave: slave as ObservableQuery<unknown, L1 | L2, P2>,
    run: (a1: A1) =>
      (master.run as Fetch<A1, L1 | L2, P1>)(a1).chain(a2 =>
        (slave.run as Fetch<P1, L2, P2>)(a2)
      ),
    invalidate: (a1: A1) =>
      (master.invalidate as Fetch<A1, L1 | L2, P1>)(a1).chain(a2 =>
        (slave.invalidate as Fetch<P1, L2, P2>)(a2)
      ),
    gc: () => {
      slave.gc();
      master.gc();
    }
  };
}

const sequenceRecordTaskEither = sequence(taskEither);

export function product<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>
): Product<
  ProductA<R>,
  { [K in keyof R]: R[K]['_L'] }[keyof R],
  { [K in keyof R]: R[K]['_P'] }
> {
  type K = keyof R;
  type A = ProductA<R>;
  type L = { [k in K]: R[k]['_L'] }[K];
  type P = { [k in K]: R[k]['_P'] };
  const runQueries = (a: A) =>
    mapWithKey(queries, (k, query) => query.run(((a || {}) as any)[k]));
  const run = (a: A) => sequenceRecordTaskEither(runQueries(a));
  const invalidateQueries = (a: A) =>
    mapWithKey(queries, (k, query) => query.invalidate(((a || {}) as any)[k]));
  const invalidate = (a: A) => sequenceRecordTaskEither(invalidateQueries(a));
  return {
    type: 'product',
    ...queryPhantoms<A, L, P>(),
    queries,
    run: run as any,
    invalidate: invalidate as any,
    gc: () => {
      map(queries, q => {
        q.gc();
      });
    }
  };
}
