import { TaskEither, taskEither } from 'fp-ts/lib/TaskEither';
import { Cache } from './Cache';
import { Setoid } from 'fp-ts/lib/Setoid';
import { mapWithKey, sequence } from 'fp-ts/lib/Record';

export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

// these type annotations are needed because fp-ts can't add stricter
// overloads yet due to https://github.com/Microsoft/TypeScript/issues/29246
const sequenceRecordTaskEither: <K extends string, L, A>(
  ta: Record<K, TaskEither<L, A>>
) => TaskEither<L, Record<K, A>> = sequence(taskEither);

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
  queries: Record<string, ObservableQuery<A, L, P>>;
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
