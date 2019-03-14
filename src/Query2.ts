import { Applicative3 } from 'fp-ts/lib/Applicative';
import { Either } from 'fp-ts/lib/Either';
import { Setoid, strictEqual } from 'fp-ts/lib/Setoid';
import { Cache } from './Cache';
import {
  ReaderTaskEither,
  fromTaskEither as RTEfromTaskEither,
  readerTaskEither
} from 'fp-ts/lib/ReaderTaskEither';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import { Task } from 'fp-ts/lib/Task';

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

class CachedQuery<A, L, P> {
  readonly type: 'Cached' = 'Cached';
  readonly _A!: A;
  readonly _L!: L;
  readonly _P!: P;
  readonly _URI!: URI;
  private readonly cache: Cache<A, L, P>;
  private readonly value: ReaderTaskEither<A, L, P>;

  constructor(
    value: ReaderTaskEither<A, L, P>,
    readonly inputSetoid: Setoid<A>
  ) {
    this.cache = new Cache<A, L, P>(value.value, inputSetoid);
    this.value = new ReaderTaskEither(this.cache.getOrFetch);
  }

  fold<R>(
    whenCached: () => R,
    _whenComposition: () => R,
    _whenProduct: () => R
  ): R {
    return whenCached();
  }

  map<B>(f: (p: P) => B): Query<A, L, B> {
    return new CachedQuery(this.value.map(f), this.inputSetoid);
  }

  ap<B>(fab: Query<A, L, (a: P) => B>): Query<A, L, B> {
    return new ProductQuery(
      readerTaskEither.ap(
        new ReaderTaskEither<A, L, (a: P) => B>(
          (a: A) =>
            new TaskEither<L, (a: P) => B>(
              new Task<Either<L, (a: P) => B>>(() => fab.run(a))
            )
        ),
        this.value
      )
    );
  }

  compose<L2, P2>(
    fetch: (a2: P) => TaskEither<L2, P2>,
    inputSetoid: Setoid<P>
  ): Query<A, L | L2, P2> {
    const slaveQ = new CachedQuery(new ReaderTaskEither(fetch), inputSetoid);
    const slave = new ReaderTaskEither<unknown, L | L2, P2>(
      a2 =>
        new TaskEither<L | L2, P2>(
          new Task<Either<L | L2, P2>>(() => slaveQ.run(a2 as any))
        )
    );
    return new CompositionQuery<A, L | L2, P2>(this.value, slave);
  }

  run(a: A): Promise<Either<L, P>> {
    return this.value.run(a);
  }
}

class CompositionQuery<A, L, P> {
  readonly type: 'Composition' = 'Composition';
  readonly _A!: A;
  readonly _L!: L;
  readonly _P!: P;
  readonly _URI!: URI;

  constructor(
    readonly master: ReaderTaskEither<A, L, unknown>,
    readonly slave: ReaderTaskEither<unknown, L, P>
  ) {}

  fold<R>(
    _whenCached: () => R,
    whenComposition: () => R,
    _whenProduct: () => R
  ): R {
    return whenComposition();
  }

  map<B>(f: (p: P) => B): Query<A, L, B> {
    return new CompositionQuery(this.master, this.slave.map(f));
  }

  ap<B>(fab: Query<A, L, (a: P) => B>): Query<A, L, B> {
    return new ProductQuery(
      readerTaskEither.ap(
        new ReaderTaskEither<A, L, (a: P) => B>(
          (a: A) =>
            new TaskEither<L, (a: P) => B>(
              new Task<Either<L, (a: P) => B>>(() => fab.run(a))
            )
        ),
        new ReaderTaskEither<A, L, P>(
          (a: A) =>
            new TaskEither<L, P>(new Task<Either<L, P>>(() => this.run(a)))
        )
      )
    );
  }

  compose<L2, P2>(
    fetch: (a2: P) => TaskEither<L2, P2>,
    inputSetoid: Setoid<P>
  ): Query<A, L | L2, P2> {
    const slaveQ = new CachedQuery(new ReaderTaskEither(fetch), inputSetoid);
    const slave = new ReaderTaskEither<unknown, L | L2, P2>(
      a2 =>
        new TaskEither<L | L2, P2>(
          new Task<Either<L | L2, P2>>(() => slaveQ.run(a2 as any))
        )
    );
    return new CompositionQuery<A, L | L2, P2>(
      this.master.chain(a => this.slave.local(() => a)),
      slave
    );
  }

  run(a: A): Promise<Either<L, P>> {
    return this.master.chain(a => this.slave.local(() => a)).run(a);
  }
}

class ProductQuery<A, L, P> {
  readonly type: 'Product' = 'Product';
  readonly _A!: A;
  readonly _L!: L;
  readonly _P!: P;
  readonly _URI!: URI;

  constructor(readonly value: ReaderTaskEither<A, L, P>) {}

  fold<R>(
    _whenCached: () => R,
    _whenComposition: () => R,
    whenProduct: () => R
  ): R {
    return whenProduct();
  }

  map<B>(f: (p: P) => B): Query<A, L, B> {
    return new ProductQuery(this.value.map(f));
  }

  ap<B>(fab: Query<A, L, (a: P) => B>): Query<A, L, B> {
    return new ProductQuery(
      readerTaskEither.ap(
        new ReaderTaskEither<A, L, (a: P) => B>(
          (a: A) =>
            new TaskEither<L, (a: P) => B>(
              new Task<Either<L, (a: P) => B>>(() => fab.run(a))
            )
        ),
        this.value
      )
    );
  }

  compose<L2, P2>(
    fetch: (a2: P) => TaskEither<L2, P2>,
    inputSetoid: Setoid<P>
  ): Query<A, L | L2, P2> {
    const slaveQ = new CachedQuery(new ReaderTaskEither(fetch), inputSetoid);
    const slave = new ReaderTaskEither<unknown, L | L2, P2>(
      a2 =>
        new TaskEither<L | L2, P2>(
          new Task<Either<L | L2, P2>>(() => slaveQ.run(a2 as any))
        )
    );
    return new CompositionQuery<A, L | L2, P2>(this.value, slave);
  }

  run(a: A): Promise<Either<L, P>> {
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

const unusedOfSetoid: Setoid<unknown> = {
  equals: strictEqual
};

function of<A, L, P>(p: P): Query<A, L, P> {
  return new CachedQuery(readerTaskEither.of<A, L, P>(p), unusedOfSetoid);
}

export function fromTaskEither<A, L, P>(te: TaskEither<L, P>): Query<A, L, P> {
  return new CachedQuery(RTEfromTaskEither(te), unusedOfSetoid);
}

export function fromFetch<A>(
  inputSetoid: Setoid<A>
): <L, P>(fetch: (a: A) => TaskEither<L, P>) => Query<A, L, P> {
  return fetch => new CachedQuery(new ReaderTaskEither(fetch), inputSetoid);
}

export const query: Applicative3<URI> = {
  URI,
  map,
  of,
  ap
};
