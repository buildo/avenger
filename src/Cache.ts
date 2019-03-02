import { Subject, Observable } from 'rxjs';
import {
  CacheValue,
  cacheValuePending,
  cacheValueError,
  cacheValueResolved
} from './CacheValue';
import { Fetch } from './Fetch';
import { TaskEither, fromLeft, taskEither } from 'fp-ts/lib/TaskEither';
import { Task } from 'fp-ts/lib/Task';
import { Either } from 'fp-ts/lib/Either';
import { Setoid } from 'fp-ts/lib/Setoid';
import { member, lookup } from 'fp-ts/lib/Map';
import { Option } from 'fp-ts/lib/Option';

export class Cache<A, L, P> {
  private readonly subjects: Map<A, Subject<CacheValue<L, P>>> = new Map();
  private readonly map: Map<A, CacheValue<L, P>> = new Map();

  private member: <T>(input: A, map: Map<A, T>) => boolean;
  private lookup: <T>(input: A, map: Map<A, T>) => Option<T>;
  private unsafeLookup: <T>(input: A, map: Map<A, T>) => T;

  constructor(readonly fetch: Fetch<A, L, P>, readonly inputSetoid: Setoid<A>) {
    this.member = member(inputSetoid);
    this.lookup = lookup(inputSetoid);
    this.unsafeLookup = (input, map) =>
      this.lookup(input, map).getOrElseL(() => {
        throw new Error('unsafe lookup fail');
      });
  }

  private unsafeGet(params: A): TaskEither<L, P> {
    const cacheValue = this.unsafeLookup(params, this.map);
    return cacheValue.fold(
      value => new TaskEither(new Task(() => value)),
      value => fromLeft(value),
      value => taskEither.of(value)
    );
  }

  private set(type: 'Resolved', params: A, value: P): P;
  private set(type: 'Error', params: A, value: L): L;
  private set(
    type: 'Pending',
    params: A,
    value: Promise<Either<L, P>>
  ): Promise<Either<L, P>>;
  private set(
    type: CacheValue<any, any>['type'],
    params: any,
    value: any
  ): any {
    const cacheValue = ((): CacheValue<any, any> => {
      switch (type) {
        case 'Pending':
          return cacheValuePending(value, new Date());
        case 'Error':
          return cacheValueError(value, new Date());
        case 'Resolved':
          return cacheValueResolved(value, new Date());
      }
    })();
    this.map.set(params, cacheValue);
    this.emitEvent(params, cacheValue);
    return value;
  }

  private emitEvent(params: A, cacheValue: CacheValue<L, P>): void {
    this.lookup(params, this.subjects).map(s => s.next(cacheValue));
  }

  getOrFetch(params: A): TaskEither<L, P> {
    if (this.member(params, this.map)) {
      return this.unsafeGet(params);
    }

    const pending = this.fetch(params)
      .bimap(
        error => this.set('Error', params, error),
        value => this.set('Resolved', params, value)
      )
      .run();
    this.set('Pending', params, pending);
    return this.unsafeGet(params);
  }

  observe(params: A): Observable<CacheValue<L, P>> {
    if (!this.member(params, this.subjects)) {
      this.subjects.set(params, new Subject());
    }
    return this.unsafeLookup(params, this.subjects).asObservable();
  }
}
