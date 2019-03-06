import { Either } from 'fp-ts/lib/Either';
import { EnforceNonEmptyRecord } from './Query';
import { Monad3 } from 'fp-ts/lib/Monad';
import { ReaderTaskEither, readerTaskEither } from 'fp-ts/lib/ReaderTaskEither';

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
  constructor(readonly value: ReaderTaskEither<A, L, P>) {}

  map<B>(f: (p: P) => B): Query<A, L, B> {
    return new CachedQuery(this.value.map(f));
  }

  ap<U, L, A, B>(fab: Query<U, L, (a: A) => B>): Query<U, L, B> {
    // TODO: actually product()
  }

  chain<U, L, A, B>(f: (a: A) => Query<U, L, B>): Query<U, L, B> {
    // TODO: actually compose()
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
  constructor(
    readonly master: ReaderTaskEither<A, L, unknown>,
    readonly slave: ReaderTaskEither<unknown, L, P>
  ) {}

  map<B>(f: (p: P) => B): Query<A, L, B> {
    return new CompositionQuery(this.master, this.slave.map(f));
  }

  ap<U, L, A, B>(fab: Query<U, L, (a: A) => B>): Query<U, L, B> {}

  chain<U, L, A, B>(f: (a: A) => Query<U, L, B>): Query<U, L, B> {}

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
  constructor(
    readonly value: ReaderTaskEither<
      EnforceNonEmptyRecord<A>,
      L,
      EnforceNonEmptyRecord<P>
    >
  ) {}

  map<B>(f: (p: P) => EnforceNonEmptyRecord<B>): Query<A, L, B> {
    return new ProductQuery(this.value.map(f));
  }

  ap<U, L, A, B>(fab: Query<U, L, (a: A) => B>): Query<U, L, B> {}

  chain<U, L, A, B>(f: (a: A) => Query<U, L, B>): Query<U, L, B> {}

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

function of<A, L, P>(p: P): Query<A, L, P> {
  return new CachedQuery(readerTaskEither.of<A, L, P>(p));
}

export const query: Monad3<URI> = {
  URI,
  map,
  of,
  ap,
  chain
};
