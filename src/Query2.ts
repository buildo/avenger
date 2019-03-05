import { TaskEither } from 'fp-ts/lib/TaskEither';
import { Either } from 'fp-ts/lib/Either';
import { EnforceNonEmptyRecord } from './Query';
import { Functor3 } from 'fp-ts/lib/Functor';

export interface Fetch<A = void, L = unknown, P = unknown> {
  (input: A): TaskEither<L, P>;
}

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
  constructor(readonly value: Fetch<A, L, P>) {}

  map<B>(f: (p: P) => B): Query<A, L, B> {
    return new CachedQuery((a: A) => this.value(a).map(f));
  }

  run(a: A): Promise<Either<L, P>> {
    return this.value(a).run();
  }
}

export class CompositionQuery<A, L, P> {
  readonly type: 'Composition' = 'Composition';
  readonly _A!: A;
  readonly _L!: L;
  readonly _P!: P;
  readonly _URI!: URI;
  constructor(
    readonly master: Fetch<A, L, unknown>,
    readonly slave: Fetch<unknown, L, P>
  ) {}

  map<B>(f: (p: P) => B): Query<A, L, B> {
    return new CompositionQuery(this.master, p1 => this.slave(p1).map(f));
  }

  run(a: A): Promise<Either<L, P>> {
    return this.master(a)
      .chain(this.slave)
      .run();
  }
}

export class ProductQuery<A, L, P> {
  readonly type: 'Product' = 'Product';
  readonly _A!: A;
  readonly _L!: L;
  readonly _P!: P;
  readonly _URI!: URI;
  constructor(
    readonly value: Fetch<EnforceNonEmptyRecord<A>, L, EnforceNonEmptyRecord<P>>
  ) {}

  map<B>(f: (p: P) => EnforceNonEmptyRecord<B>): Query<A, L, B> {
    return new ProductQuery((a: EnforceNonEmptyRecord<A>) =>
      this.value(a).map(f)
    );
  }

  run(a: EnforceNonEmptyRecord<A>): Promise<Either<L, P>> {
    return this.value(a).run();
  }
}

function map<A, L, P, B>(fa: Query<A, L, P>, f: (p: P) => B): Query<A, L, B> {
  return fa.map(f);
}

export const query: Functor3<URI> = {
  URI,
  map
};
