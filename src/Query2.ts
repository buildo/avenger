import { Either } from 'fp-ts/lib/Either';
import { EnforceNonEmptyRecord } from './Query';
import { Monad3 } from 'fp-ts/lib/Monad';
import { ReaderTaskEither, readerTaskEither } from 'fp-ts/lib/ReaderTaskEither';
import { Setoid, strictEqual } from 'fp-ts/lib/Setoid';
import { Cache } from './Cache';

declare module 'fp-ts/lib/HKT' {
  interface URI2HKT3<U, L, A> {
    Query: Query<U, L, A>;
  }
}

export const URI = 'Query';

export type URI = typeof URI;

export type Query<A, L, P> =
  | CachedQuery<A, L, P>
  | CompositionQuery<A, L, P>
  | ProductQuery<A, L, P>;

export class CachedQuery<A, L, P> {
  readonly type: 'Cached' = 'Cached';
  readonly _A!: A;
  readonly _L!: L;
  readonly _P!: P;
  readonly _URI!: URI;
  private readonly cache: Cache<A, L, P>;
  private readonly value: ReaderTaskEither<A, L, P>;

  private constructor(
    value: ReaderTaskEither<A, L, P>,
    readonly inputSetoid: Setoid<A>
  ) {
    this.cache = new Cache<A, L, P>(value.value, inputSetoid);
    this.value = new ReaderTaskEither(this.cache.getOrFetch);
  }

  fold<R>(
    whenCached: (cache: Cache<A, L, P>) => R,
    _whenComposition: () => R,
    _whenProduct: () => R
  ): R {
    return whenCached(this.cache);
  }

  map<B>(f: (p: P) => B): Query<A, L, B> {
    return new CachedQuery(this.value.map(f), this.inputSetoid);
  }

  ap<U, L, A, B>(_fab: Query<U, L, (a: A) => B>): Query<U, L, B> {
    // TODO: actually product()
    throw new Error('unimplemented');
  }

  chain<U, L, A, B>(_f: (a: A) => Query<U, L, B>): Query<U, L, B> {
    // TODO: actually compose()
    throw new Error('unimplemented');
  }

  run(a: A): Promise<Either<L, P>> {
    return this.value.run(a);
  }
}

export class CompositionQuery<A, L, P> {
  readonly type: 'Composition' = 'Composition';
  readonly _A!: A;
  readonly _L!: L;
  readonly _P!: P;
  readonly _URI!: URI;

  private constructor(
    readonly master: ReaderTaskEither<A, L, unknown>,
    readonly slave: ReaderTaskEither<unknown, L, P>
  ) {}

  fold<R>(
    _whenCached: (cache: Cache<A, L, P>) => R,
    whenComposition: () => R,
    _whenProduct: () => R
  ): R {
    return whenComposition();
  }

  map<B>(f: (p: P) => B): Query<A, L, B> {
    return new CompositionQuery(this.master, this.slave.map(f));
  }

  ap<U, L, A, B>(_fab: Query<U, L, (a: A) => B>): Query<U, L, B> {
    throw new Error('unimplemented');
  }

  chain<U, L, A, B>(_f: (a: A) => Query<U, L, B>): Query<U, L, B> {
    throw new Error('unimplemented');
  }

  run(a: A): Promise<Either<L, P>> {
    return this.master.chain(a => this.slave.local(() => a)).run(a);
  }
}

export class ProductQuery<A, L, P> {
  readonly type: 'Product' = 'Product';
  readonly _A!: A;
  readonly _L!: L;
  readonly _P!: P;
  readonly _URI!: URI;

  private constructor(
    readonly value: ReaderTaskEither<
      EnforceNonEmptyRecord<A>,
      L,
      EnforceNonEmptyRecord<P>
    >
  ) {}

  fold<R>(
    _whenCached: (cache: Cache<A, L, P>) => R,
    _whenComposition: () => R,
    whenProduct: () => R
  ): R {
    return whenProduct();
  }

  map<B>(f: (p: P) => EnforceNonEmptyRecord<B>): Query<A, L, B> {
    return new ProductQuery(this.value.map(f));
  }

  ap<U, L, A, B>(_fab: Query<U, L, (a: A) => B>): Query<U, L, B> {
    throw new Error('unimplemented');
  }

  chain<U, L, A, B>(_f: (a: A) => Query<U, L, B>): Query<U, L, B> {
    throw new Error('unimplemented');
  }

  run(a: EnforceNonEmptyRecord<A>): Promise<Either<L, P>> {
    return this.value.run(a);
  }
}

function map<A, L, P, B>(fa: Query<A, L, P>, f: (p: P) => B): Query<A, L, B> {
  return fa.map(f);
}

function ap<U, L, A, B>(
  fab: Query<U, L, (a: A) => B>,
  fa: Query<U, L, A>
): Query<U, L, B> {
  return fa.ap(fab);
}

function chain<U, L, A, B>(
  fa: Query<U, L, A>,
  f: (a: A) => Query<U, L, B>
): Query<U, L, B> {
  return fa.chain(f);
}

const unusedOfSetoid: Setoid<unknown> = {
  equals: strictEqual
};

function of<A, L, P>(p: P): Query<A, L, P> {
  // @ts-ignore
  return new CachedQuery(readerTaskEither.of<A, L, P>(p), unusedOfSetoid);
}

export const query: Monad3<URI> = {
  URI,
  map,
  of,
  ap,
  chain
};
