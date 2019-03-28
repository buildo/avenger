import { TaskEither, taskEither } from 'fp-ts/lib/TaskEither';
import { Cache } from './Cache';
import { mapWithKey, sequence } from 'fp-ts/lib/Record';
import { Strategy, shallowEqual, JSON, JSONStringifyEqual } from './Strategy';
import { Setoid, fromEquals, strictEqual } from 'fp-ts/lib/Setoid';

export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

export type Fetch<A, L, P> = (input: A) => TaskEither<L, P>;

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
  queries: Record<string, ObservableQuery<A, L, P>>;
}

export type ObservableQuery<A, L, P> =
  | CachedQuery<A, L, P>
  | Composition<A, L, P>
  | Product<A, L, P>;

export function query<A, L, P>(
  fetch: Fetch<A, L, P>
): (strategy: Strategy<A, L, P>) => CachedQuery<A, L, P> {
  return strategy => {
    const cache = new Cache<A, L, P>(fetch, strategy);
    return {
      type: 'cached',
      ...queryPhantoms<A, L, P>(),
      cache,
      run: cache.getOrFetch,
      invalidate: cache.invalidate
    };
  };
}

export function queryStrict<A, L, P>(
  fetch: Fetch<A, L, P>,
  makeStrategy: (inputSetoid: Setoid<A>) => Strategy<A, L, P>
): CachedQuery<A, L, P> {
  return query(fetch)(makeStrategy(fromEquals(strictEqual)));
}

export function queryShallow<A, L, P>(
  fetch: Fetch<A, L, P>,
  makeStrategy: (inputSetoid: Setoid<A>) => Strategy<A, L, P>
): CachedQuery<A, L, P> {
  return query(fetch)(makeStrategy(fromEquals(shallowEqual)));
}

export function queryJSONStringify<A extends JSON, L, P>(
  fetch: Fetch<A, L, P>,
  makeStrategy: (inputSetoid: Setoid<A>) => Strategy<A, L, P>
): CachedQuery<A, L, P> {
  return query(fetch)(makeStrategy(fromEquals(JSONStringifyEqual)));
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
      )
  };
}

const sequenceRecordTaskEither: <K extends string, L, A>(
  ta: Record<K, TaskEither<L, A>>
) => TaskEither<L, Record<K, A>> = sequence(taskEither);

export function product<
  R extends Record<string, ObservableQuery<any, any, any>>
>(
  queries: EnforceNonEmptyRecord<R>
): Product<
  { [K in keyof R]: R[K]['_A'] },
  { [K in keyof R]: R[K]['_L'] }[keyof R],
  { [K in keyof R]: R[K]['_P'] }
> {
  type K = keyof R;
  type A = { [k in K]: R[k]['_A'] };
  type L = { [k in K]: R[k]['_L'] }[K];
  type P = { [k in K]: R[k]['_P'] };
  const runQueries = (a: A) =>
    mapWithKey(queries, (k, query) => query.run(a[k]));
  const run = (a: A) => sequenceRecordTaskEither(runQueries(a));
  const invalidateQueries = (a: A) =>
    mapWithKey(queries, (k, query) => query.run(a[k]));
  const invalidate = (a: A) => sequenceRecordTaskEither(invalidateQueries(a));
  return {
    type: 'product',
    ...queryPhantoms<A, L, P>(),
    queries,
    run: run as any,
    invalidate: invalidate as any
  };
}
