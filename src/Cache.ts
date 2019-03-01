import { Subject, Observable } from 'rxjs';
import {
  CacheValue,
  cacheValuePending,
  cacheValueError,
  cacheValueResolved
} from './CacheValue';
import { Fetch } from './Fetch';
import { Strategy } from './Strategy';
import { TaskEither, fromLeft, taskEither } from 'fp-ts/lib/TaskEither';
import { Task } from 'fp-ts/lib/Task';
import { Either } from 'fp-ts/lib/Either';

export class Cache<A, L, P> {
  private readonly subjects: Map<A, Subject<CacheValue<L, P>>> = new Map();

  constructor(
    readonly fetch: Fetch<A, L, P>,
    readonly strategy: Strategy<A, L, P>,
    readonly map: Map<A, CacheValue<L, P>> = new Map()
  ) {}

  private unsafeGet(params: A): TaskEither<L, P> {
    const cacheValue = this.map.get(params)!;
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
    if (this.subjects.has(params)) {
      this.subjects.get(params)!.next(cacheValue);
    }
  }

  getOrFetch(params: A): TaskEither<L, P> {
    if (this.map.has(params) && this.strategy(this.map.get(params)!, params)) {
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
    if (!this.subjects.has(params)) {
      this.subjects.set(params, new Subject());
    }
    return this.subjects.get(params)!.asObservable();
  }
}
