// @flow
import debug from 'debug'

import type {
  StrategyT
} from './strategies'

import type {
  FetchT
} from '../fetch/operators'

type Done<P> = {
  value: P,         // il valore contenuto nella promise
  timestamp: number,  // il momento in cui è stato valorizzato done
  promise: Promise<P>      // la promise che conteneva il done
};

export type CacheValue<P> = {
  done?: Done<P>,
  blocked?: Promise<P>
};

export type CacheOptions = {
  name?: string;
  map?: Map;
  atok?: Function;
};

export const empty: CacheValue<any> = Object.freeze({})

export class Cache<A, P> {

  name: string;
  map: Map;
  atok: Function;
  log: Function;

  constructor(options?: CacheOptions = {}) {
    this.name = options.name || '<anonymous>'
    this.map = options.map || new Map()
    this.atok = options.atok || JSON.stringify
    this.log = debug(`avenger:${this.name}`)
  }

  get(a: A): CacheValue<P> {
    return this.map.get(this.atok(a)) || empty
  }

  set(a: A, value: CacheValue<P>) {
    return this.map.set(this.atok(a), value)
  }

  delete(a: A) {
    return this.map.delete(this.atok(a))
  }

  clear() {
    return this.map.clear()
  }

  getAvailablePromise(a: A, strategy: StrategyT): ?Promise<P> {
    const value = this.get(a)

    if (strategy.isAvailable(value)) {
      this.log('getAvailablePromise(%o, %s): returning available done %o', a, String(strategy), value.done)
      if (value.done) {
        return value.done.promise
      }
    }

    if (value.blocked) {
      this.log('getAvailablePromise(%o, %s): returning available promise', a, String(strategy))
      return value.blocked
    }

    this.log('getAvailablePromise(%o, %s): cache miss', a, String(strategy))
  }

  getPromise(a: A, strategy: StrategyT, fetch: FetchT): Promise /* Promise[P] */ {
    const availablePromise = this.getAvailablePromise(a, strategy)
    if (availablePromise) {
      return availablePromise
    }

    this.log('getPromise(%o, %s): fetching and returning related promise', a, String(strategy))
    const promise = fetch(a)
    this.storePromise(a, promise)
    return promise
  }

  storePayload(a: A, p: P, promise: Promise<P>) {
    const timestamp = new Date().getTime()

    const value: CacheValue = {
      done: {
        value: p,
        timestamp,
        promise
      }
    }

    // se c'è una promise in flight la mantengo
    const { blocked } = this.get(a)
    if (blocked !== promise) {
      value.blocked = blocked
    }

    this.log('storing %o => %o (ts: %o)', a, p, timestamp)
    this.set(a, value)
  }

  storePromise(a: A, promise: Promise<P>) {
    // quando la promise risolve immagazzino il nuovo payload
    promise.then(p => {
      this.storePayload(a, p, promise)
    })

    // immagazzino il nuovo valore mantenendo il payload presente
    const { done } = this.get(a)
    const value = { done, blocked: promise }
    this.set(a, value)
  }

}