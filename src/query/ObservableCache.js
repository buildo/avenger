import { BehaviorSubject } from 'rxjs/BehaviorSubject';

import {
  Cache
} from '../cache/Cache'

export class ObservableCache extends Cache {

  constructor(options) {
    super(options)
    this.subjects = {}
  }

  getSubject(a) {
    const k = this.atok(a)
    if (!this.subjects.hasOwnProperty(k)) {
      this.log('creating ReplaySubject for %o', a)
      this.subjects[k] = new BehaviorSubject({})
    }
    return this.subjects[k]
  }

  storePayload(a, p, promise) {
    super.storePayload(a, p, promise)
    this.emitPayloadEvent(a, p)
  }

  storePromise(a, promise) {
    super.storePromise(a, promise)
    this.emitLoadingEvent(a)
    promise.then(
      null,
      error => this.emitErrorEvent(a, error)
    )
  }

  emitLoadingEvent(a) {
    this.log('emitting LOADING event for %o', a)
    const subject = this.getSubject(a)
    const event = { loading: true }
    if (subject.value.hasOwnProperty('data')) {
      event.data = subject.value.data
    }
    subject.next(event)
  }

  emitPayloadEvent(a, p) {
    this.log('emitting PAYLOAD event for %o (payload: %o)', a, p)
    const subject = this.getSubject(a)
    subject.next({
      loading: false,
      data: p
    })
  }

  emitErrorEvent(a, error) {
    this.log('emitting ERROR event for %o', a)
    const subject = this.getSubject(a)
    subject.next({ loading: false, error })
  }

}
