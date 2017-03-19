import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import {
  Cache,
  CacheOptions
} from '../cache/Cache'

export interface CacheEvent<P> {
  loading?: boolean,
  data?: P,
  error?: any
}

export class ObservableCache<A, P, S> extends Cache<A, P> {

  readonly subjects: { [key: string]: BehaviorSubject<CacheEvent<P>> }
  deleteBySingleton?: (a: S) => void

  constructor(options: CacheOptions<A, P>) {
    super(options)
    this.subjects = {}
  }

  getSubject(a: A) {
    const k = this.atok(a)
    if (!this.subjects.hasOwnProperty(k)) {
      this.log('creating ReplaySubject for %o', a)
      this.subjects[k] = new BehaviorSubject({})
    }
    return this.subjects[k]
  }

  storePayload(a: A, p: P, promise: Promise<P>) {
    super.storePayload(a, p, promise)
    this.emitPayloadEvent(a, p)
  }

  storePromise(a: A, promise: Promise<P>) {
    super.storePromise(a, promise)
    this.emitLoadingEvent(a)
    promise.then(
      null,
      error => this.emitErrorEvent(a, error)
    )
  }

  emitLoadingEvent(a: A) {
    this.log('emitting LOADING event for %o', a)
    const subject = this.getSubject(a)
    const event: CacheEvent<P> = { loading: true }
    if (subject.value.hasOwnProperty('data')) {
      event.data = subject.value.data
    }
    subject.next(event)
  }

  emitPayloadEvent(a: A, p: P) {
    this.log('emitting PAYLOAD event for %o (payload: %o)', a, p)
    const subject = this.getSubject(a)
    subject.next({
      loading: false,
      data: p
    })
  }

  emitErrorEvent(a: A, error: any) { // TODO
    this.log('emitting ERROR event for %o', a)
    const subject = this.getSubject(a)
    const event: CacheEvent<P> = { loading: true, error }
    if (subject.value.hasOwnProperty('data')) {
      event.data = subject.value.data
    }
    subject.next(event)
  }

}
