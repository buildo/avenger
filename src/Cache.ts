import { Observable, BehaviorSubject } from 'rxjs';
import {
  CacheValue,
  cacheValuePending,
  cacheValueError,
  cacheValueResolved,
  cacheValueInitial
} from './CacheValue';
import { Fetch } from './Query';
import { lookup } from 'fp-ts/lib/Map';
import { Option, some } from 'fp-ts/lib/Option';
import { TaskEither, fromLeft, taskEither } from 'fp-ts/lib/TaskEither';
import { Task } from 'fp-ts/lib/Task';
import { Strategy } from './Strategy';
import { distinctUntilChanged } from 'rxjs/operators';

export class Cache<A, L, P> {
  private subjects: Map<A, BehaviorSubject<CacheValue<L, P>>> = new Map();
  private readonly _lookup: <T>(input: A, map: Map<A, T>) => Option<T>;

  constructor(
    readonly fetch: Fetch<A, L, P>,
    readonly strategy: Strategy<A, L, P>
  ) {
    this._lookup = lookup(strategy.inputSetoid);
  }

  private readonly lookup = (input: A) => this._lookup(input, this.subjects);

  private readonly member = (input: A) => this.lookup(input).isSome();

  private readonly unsafeLookup = (input: A) =>
    this.lookup(input).getOrElseL(() => {
      throw new Error('unsafe lookup failed');
    });

  private emitEvent(input: A, cacheValue: CacheValue<L, P>): void {
    this.lookup(input).map(s => s.next(cacheValue));
  }

  private getOrCreateSubject(input: A): BehaviorSubject<CacheValue<L, P>> {
    if (!this.member(input)) {
      this.subjects.set(input, new BehaviorSubject(cacheValueInitial<L, P>()));
      this.createPending(input);
    }
    return this.unsafeLookup(input);
  }

  private createPending = (input: A): TaskEither<L, P> => {
    const pending = this.fetch(input).bimap(
      error => {
        this.emitEvent(input, cacheValueError(error, new Date()));
        return error;
      },
      value => {
        this.emitEvent(input, cacheValueResolved(value, new Date()));
        return value;
      }
    );
    this.emitEvent(input, cacheValuePending(pending.value.run(), new Date()));
    return pending;
  };

  getOrFetch = (input: A): TaskEither<L, P> => {
    return some(this.getOrCreateSubject(input).value)
      .filter(this.strategy.filter)
      .foldL(
        () => this.createPending(input),
        cacheValue =>
          cacheValue.fold(
            () => this.createPending(input),
            pending => new TaskEither(new Task(() => pending)),
            error => fromLeft<L, P>(error),
            value => taskEither.of<L, P>(value)
          )
      );
  };

  invalidate = (input: A): TaskEither<L, P> => {
    this.lookup(input).map(s => s.next(cacheValueInitial<L, P>()));
    return this.getOrFetch(input);
  };

  observe(input: A): Observable<CacheValue<L, P>> {
    return this.getOrCreateSubject(input)
      .asObservable()
      .pipe(distinctUntilChanged(this.strategy.cacheValueSetoid.equals));
  }

  get(input: A): CacheValue<L, P> {
    return this.lookup(input)
      .map(s => s.value)
      .getOrElseL(cacheValueInitial);
  }
}
