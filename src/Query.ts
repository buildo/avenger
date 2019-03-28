import { TaskEither, taskEither } from 'fp-ts/lib/TaskEither';
import { Cache } from './Cache';
import { mapWithKey, sequence } from 'fp-ts/lib/Record';
import { Strategy, shallowEqual, JSON, JSONStringifyEqual } from './Strategy';
import { Setoid, fromEquals, strictEqual } from 'fp-ts/lib/Setoid';

export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

// these type annotations are needed because fp-ts can't add stricter
// overloads yet due to https://github.com/Microsoft/TypeScript/issues/29246
const sequenceRecordTaskEither: <K extends string, L, A>(
  ta: Record<K, TaskEither<L, A>>
) => TaskEither<L, Record<K, A>> = sequence(taskEither);

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

export interface Composition<A1, L1, P1, L2, P2>
  extends BaseQuery<A1, L1 | L2, P2> {
  type: 'composition';
  master: ObservableQuery<A1, L1, P1>;
  slave: ObservableQuery<P1, L2, P2>;
}

export interface Product<A, L, P> extends BaseQuery<A, L, P> {
  type: 'product';
  queries: Record<string, ObservableQuery<A, L, P>>;
}

export type ObservableQuery<A, L, P> =
  | CachedQuery<A, L, P>
  | Composition<A, L, unknown, L, P>
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
  R extends Record<string, ObservableQuery<any, any, any>>
>(
  queries: EnforceNonEmptyRecord<R>
): Product<
  { [K in keyof R]: R[K]['_A'] },
  { [K in keyof R]: R[K]['_L'] }[keyof R],
  { [K in keyof R]: R[K]['_P'] }
> {
  type A = { [K in keyof R]: R[K]['_A'] };
  const runQueries = (a: A) =>
    mapWithKey(queries, (k, query) => query.run(a[k]));
  const invalidateQueries = (a: A) =>
    mapWithKey(queries, (k, query) => query.run(a[k]));
  return {
    type: 'product',
    ...queryPhantoms<
      A,
      { [K in keyof R]: R[K]['_L'] }[keyof R],
      { [K in keyof R]: R[K]['_P'] }
    >(),
    queries,
    // @ts-ignore
    run: (a: A) => sequenceRecordTaskEither(runQueries(a)),
    // @ts-ignore
    invalidate: (a: A) => sequenceRecordTaskEither(invalidateQueries(a))
  };
}
