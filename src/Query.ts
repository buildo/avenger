import { TaskEither, taskEither } from 'fp-ts/lib/TaskEither';
import { Cache } from './Cache';
import {
  Strategy,
  JSON,
  setoidStrict,
  setoidShallow,
  setoidJSON,
  available
} from './Strategy';
import { Setoid, getRecordSetoid, contramap } from 'fp-ts/lib/Setoid';
import { CacheValue, getSetoid } from './CacheValue';
import {
  EnforceNonEmptyRecord,
  ObservableQueries,
  ProductA,
  ProductL,
  ProductP
} from './util';
import { mapWithKey, sequence, map as mapRecord } from 'fp-ts/lib/Record';

/**
 * A function that is asynchronous and can fail
 */
export type Fetch<A, L, P> = (input: A) => TaskEither<L, P>;

interface BaseQuery<A, L, P> {
  _A: A;
  _L: L;
  _P: P;
  inputSetoid: Setoid<A>;
  run: Fetch<A, L, P>;
  invalidate: Fetch<A, L, P>;
}

function queryPhantoms<A, L, P>(): { _A: A; _L: L; _P: P } {
  return null as any;
}

/**
 * Represents a cached query, aka a `Fetch` that is cached with a given policy and can be `observe`d
 */
export interface CachedQuery<A, L, P> extends BaseQuery<A, L, P> {
  type: 'cached';
  cache: Cache<A, L, P>;
}

/**
 * Represents a query that is the result of composing two queries that are run one after the other.
 * The `master` is successful, its result is fed into `slave`, yielding the composition result.
 */
export interface Composition<A, L, P> extends BaseQuery<A, L, P> {
  type: 'composition';
  master: ObservableQuery<A, L, unknown>;
  slave: ObservableQuery<unknown, L, P>;
}

/**
 * Represents a query that aggregates the results of N `queries` when all are successful, or yields the first failure
 */
export interface Product<A, L, P> extends BaseQuery<A, L, P> {
  type: 'product';
  queries: Record<string, ObservableQuery<A[keyof A], L, P[keyof P]>>;
}

/**
 * Represents a query that aggregates the results of 2 `queries` by giving precedence
 * to the first (`main`) or falling back to the second (`alt`) in case of error on `main`.
 * The `main` `inputSetoid` will be used.
 */
export interface Alternative<A, L, P> extends BaseQuery<A, L, P> {
  type: 'alternative';
  main: ObservableQuery<A, L, P>;
  alt: ObservableQuery<A, L, P>;
}

/**
 * A query that can be `observe`d
 */
export type ObservableQuery<A, L, P> =
  | CachedQuery<A, L, P>
  | Composition<A, L, P>
  | Product<A, L, P>
  | Alternative<A, L, P>;

/**
 * Constructs a `CachedQuery` given a `Fetch` function and a cache `Strategy`
 * @param fetch The function to be cached
 */
export function query<A = void, L = unknown, P = unknown>(
  fetch: Fetch<A, L, P>
): (strategy: Strategy<A, L, P>) => CachedQuery<A, L, P> {
  return strategy => {
    const cache = new Cache<A, L, P>(fetch, strategy);
    return {
      type: 'cached',
      ...queryPhantoms<A, L, P>(),
      inputSetoid: strategy.inputSetoid,
      cache,
      run: cache.run,
      invalidate: cache.invalidate
    };
  };
}

export type StrategyBuilder<A, L, P> = (
  inputSetoid: Setoid<A>,
  cacheValueSetoid: Setoid<CacheValue<L, P>>
) => Strategy<A, L, P>;

/**
 * Constructs a `CachedQuery` with a `Strategy` that uses strict equality to compare inputs and results
 * @param fetch The function to be cached
 * @param makeStrategy Implements the `Strategy` used to filter available values from the cache
 */
export function queryStrict<A = void, L = unknown, P = unknown>(
  fetch: Fetch<A, L, P>,
  makeStrategy: StrategyBuilder<A, L, P>
): CachedQuery<A, L, P> {
  return query(fetch)(
    makeStrategy(setoidStrict, getSetoid(setoidStrict, setoidStrict))
  );
}

/**
 * Constructs a `CachedQuery` with a `Strategy` that uses shallow equality to compare inputs and results
 * @param fetch The function to be cached
 * @param makeStrategy Implements the `Strategy` used to filter available values from the cache
 */
export function queryShallow<A = void, L = unknown, P = unknown>(
  fetch: Fetch<A, L, P>,
  makeStrategy: StrategyBuilder<A, L, P>
): CachedQuery<A, L, P> {
  return query(fetch)(
    makeStrategy(setoidShallow, getSetoid(setoidShallow, setoidShallow))
  );
}

/**
 * Constructs a `CachedQuery` with a `Strategy` that uses `JSON.stringify` to compare inputs and results
 * @param fetch The function to be cached
 * @param makeStrategy Implements the `Strategy` used to filter available values from the cache
 */
export function queryJSON<A extends JSON, L extends JSON, P extends JSON>(
  fetch: Fetch<A, L, P>,
  makeStrategy: StrategyBuilder<A, L, P>
): CachedQuery<A, L, P> {
  return query(fetch)(
    makeStrategy(setoidJSON, getSetoid(setoidJSON, setoidJSON))
  );
}

/**
 * Constructs a `Composition`
 * @param master A `Fetch` to run first, receiving the composition input
 * @param slave A `Fetch` to run with the result of `master` as input
 */
export function compose<A1, L1, P1, L2, P2>(
  master: ObservableQuery<A1, L1, P1>,
  slave: ObservableQuery<P1, L2, P2>
): Composition<A1, L1 | L2, P2> {
  return {
    type: 'composition',
    ...queryPhantoms<A1, L1 | L2, P2>(),
    inputSetoid: master.inputSetoid,
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

const sequenceRecordTaskEither = sequence(taskEither);

/**
 * Constructs a `Product`
 * @param queries A record of `Fetch` functions
 */
export function product<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>
): Product<ProductA<R>, ProductL<R>, ProductP<R>> {
  type A = ProductA<R>;
  const runQueries = (a: A) =>
    mapWithKey(queries, (k, query) => query.run(((a || {}) as any)[k]));
  const run = (a: A) => sequenceRecordTaskEither(runQueries(a));
  const invalidateQueries = (a: A) =>
    mapWithKey(queries, (k, query) => query.invalidate(((a || {}) as any)[k]));
  const invalidate = (a: A) => sequenceRecordTaskEither(invalidateQueries(a));
  return {
    type: 'product',
    ...queryPhantoms<A, ProductL<R>, ProductP<R>>(),
    inputSetoid: contramap(
      i => i || ({} as any),
      getRecordSetoid(mapRecord(queries, q => q.inputSetoid))
    ),
    queries,
    run: run as any,
    invalidate: invalidate as any
  };
}

/**
 * Constructs an `Alternative`
 * @param queries A record of `Fetch` functions
 */
export function alternative<A, L, P>(
  main: ObservableQuery<A, L, P>,
  alt: ObservableQuery<A, L, P>
): Alternative<A, L, P> {
  return {
    type: 'alternative',
    ...queryPhantoms<A, L, P>(),
    inputSetoid: main.inputSetoid,
    main,
    alt,
    run: (a: A) => main.run(a).orElse(() => alt.run(a)),
    invalidate: (a: A) => main.invalidate(a).orElse(() => alt.invalidate(a))
  };
}

/**
 * Apply a transformation to the result of a successful `ObservableQuery`
 * @param fa An `ObservableQuery`
 * @param f The function transforming the success result
 */
export function map<U, L, A, B>(
  fa: ObservableQuery<U, L, A>,
  f: (a: A) => B
): ObservableQuery<U, L, B> {
  return compose(
    fa,
    queryStrict(a => taskEither.of<L, B>(f(a)), available)
  );
}
