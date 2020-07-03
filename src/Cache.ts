import { Observable, BehaviorSubject, empty } from 'rxjs';
import * as CV from './CacheValue';
import { Fetch } from './Query';
import * as Ma from 'fp-ts/lib/Map';
import * as O from 'fp-ts/lib/Option';
import * as TE from 'fp-ts/lib/TaskEither';
import * as S from './Strategy';
import { distinctUntilChanged, tap, concat } from 'rxjs/operators';
import * as E from 'fp-ts/lib/Either';
import { flow } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

export class Cache<A, L, P> {
  private subjects: Map<A, BehaviorSubject<CV.CacheValue<L, P>>> = new Map();
  private readonly _lookup: <T>(input: A, map: Map<A, T>) => O.Option<T>;

  constructor(
    readonly fetch: Fetch<A, L, P>,
    readonly strategy: S.Strategy<A, L, P>
  ) {
    this._lookup = Ma.lookup(strategy.inputEq);
  }

  private readonly lookup = (input: A) => this._lookup(input, this.subjects);

  private readonly member = flow(this.lookup, O.isSome);

  private readonly unsafeLookup = flow(
    this.lookup,
    O.getOrElse(
      (): BehaviorSubject<CV.CacheValue<L, P>> => {
        throw new Error('unsafe lookup failed');
      }
    )
  );

  private emitEvent = (input: A, cacheValue: CV.CacheValue<L, P>): void => {
    pipe(
      input,
      this.lookup,
      O.fold(
        () => {},
        s => {
          s.next(cacheValue);
        }
      )
    );
  };

  private getOrCreateSubject = (
    input: A
  ): BehaviorSubject<CV.CacheValue<L, P>> => {
    if (!this.member(input)) {
      this.subjects.set(
        input,
        new BehaviorSubject<CV.CacheValue<L, P>>(CV.cacheValueInitial)
      );
    }
    return this.unsafeLookup(input);
  };

  private createPending = (input: A): TE.TaskEither<L, P> => {
    return () => {
      const pending = pipe(
        input,
        this.fetch,
        TE.bimap(
          error => {
            this.emitEvent(input, CV.cacheValueError(error, new Date()));
            return error;
          },
          value => {
            this.emitEvent(input, CV.cacheValueResolved(value, new Date()));
            return value;
          }
        )
      )();
      this.emitEvent(input, CV.cacheValuePending(pending, new Date()));
      return pending;
    };
  };

  run = (input: A): TE.TaskEither<L, P> => {
    return pipe(
      this.getOrCreateSubject(input).value,
      O.some,
      O.filter(this.strategy.filter),
      O.fold(
        () => this.createPending(input),
        CV.fold(
          () => this.createPending(input),
          pending => () => pending,
          TE.left,
          TE.right
        )
      )
    );
  };

  private sameInvalidationFrame = false;

  invalidate = (input: A): TE.TaskEither<L, P> => {
    return pipe(
      TE.fromIOEither<L, void>(() => {
        if (!this.sameInvalidationFrame) {
          this.sameInvalidationFrame = true;
          this.emitEvent(input, CV.cacheValueInitial);
          Promise.resolve().then(() => {
            this.sameInvalidationFrame = false;
          });
        }
        return E.right(undefined);
      }),
      TE.chain(() => this.run(input))
    );
  };

  observe = (input: A): Observable<CV.CacheValue<L, P>> => {
    const observable = this.getOrCreateSubject(input)
      .asObservable()
      .pipe(distinctUntilChanged(this.strategy.cacheValueEq.equals));

    return empty().pipe(
      tap(null, null, () => {
        this.run(input)();
      }),
      concat(observable)
    );
  };
}
