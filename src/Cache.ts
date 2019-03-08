import { Observable, BehaviorSubject } from 'rxjs';
import {
  CacheValue,
  cacheValuePending,
  cacheValueError,
  cacheValueResolved,
  cacheValueInitial
} from './CacheValue';
import { Fetch } from './Query';
import { Setoid } from 'fp-ts/lib/Setoid';
import { member, lookup, remove } from 'fp-ts/lib/Map';
import { Option } from 'fp-ts/lib/Option';
import { TaskEither, fromLeft, taskEither } from 'fp-ts/lib/TaskEither';
import { Task } from 'fp-ts/lib/Task';

export class Cache<A, L, P> {
  private subjects: Map<A, BehaviorSubject<CacheValue<L, P>>> = new Map();
  private readonly member: <T>(input: A, map: Map<A, T>) => boolean;
  private readonly lookup: <T>(input: A, map: Map<A, T>) => Option<T>;
  private readonly remove: <T>(input: A, map: Map<A, T>) => Map<A, T>;
  private readonly unsafeLookup: <T>(input: A, map: Map<A, T>) => T;

  constructor(readonly fetch: Fetch<A, L, P>, readonly inputSetoid: Setoid<A>) {
    this.member = member(inputSetoid);
    this.lookup = lookup(inputSetoid);
    this.remove = remove(inputSetoid);
    this.unsafeLookup = (input, map) =>
      this.lookup(input, map).getOrElseL(() => {
        throw new Error('unsafe lookup failed');
      });
  }

  private emitEvent(input: A, cacheValue: CacheValue<L, P>): void {
    this.lookup(input, this.subjects).map(s => s.next(cacheValue));
  }

  private getSubject(input: A): BehaviorSubject<CacheValue<L, P>> {
    if (!this.member(input, this.subjects)) {
      this.subjects.set(input, new BehaviorSubject(cacheValueInitial<L, P>()));
      this.createPending(input);
    }
    return this.unsafeLookup(input, this.subjects);
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
    return this.getSubject(input).value.fold(
      () => this.createPending(input),
      pending => new TaskEither(new Task(() => pending)),
      error => fromLeft<L, P>(error),
      value => taskEither.of<L, P>(value)
    );
  };

  invalidate = (input: A): TaskEither<L, P> => {
    this.subjects = this.remove(input, this.subjects);
    return this.getOrFetch(input);
  };

  observe(input: A): Observable<CacheValue<L, P>> {
    return this.getSubject(input).asObservable();
  }
}
