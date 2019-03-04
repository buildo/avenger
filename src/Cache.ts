import { Observable, BehaviorSubject } from 'rxjs';
import {
  CacheValue,
  cacheValuePending,
  cacheValueError,
  cacheValueResolved,
  cacheValueInitial
} from './CacheValue';
import { Fetch } from './Query';
import { Either } from 'fp-ts/lib/Either';
import { Setoid } from 'fp-ts/lib/Setoid';
import { member, lookup, remove } from 'fp-ts/lib/Map';
import { Option, some, none } from 'fp-ts/lib/Option';

function toResolvedOnly<L, P>(
  pending: Promise<Either<L, P>>
): Promise<Option<P>> {
  return pending.then(r => r.fold(() => none, v => some(v)));
}

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

  private createPending = (input: A) => {
    const pending = this.fetch(input)
      .bimap(
        error => {
          this.emitEvent(input, cacheValueError(error, new Date()));
          return error;
        },
        value => {
          this.emitEvent(input, cacheValueResolved(value, new Date()));
          return value;
        }
      )
      .run();
    this.emitEvent(input, cacheValuePending(pending, new Date()));
    return toResolvedOnly(pending);
  };

  getOrFetch = (input: A): Promise<Option<P>> => {
    return this.getSubject(input).value.fold(
      () => this.createPending(input),
      toResolvedOnly,
      () => Promise.resolve(none),
      value => Promise.resolve(some(value))
    );
  };

  invalidate = (input: A): Promise<Option<P>> => {
    this.subjects = this.remove(input, this.subjects);
    return this.getOrFetch(input);
  };

  observe(input: A): Observable<CacheValue<L, P>> {
    return this.getSubject(input).asObservable();
  }
}
