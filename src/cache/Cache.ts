import * as debug from 'debug'
import { Strategy, CacheValue } from './strategies'
import { Fetch } from '../fetch/operators'

export const empty: Readonly<CacheValue<any>> = Object.freeze({})

export type CacheOptions<A, P> = {
  name?: string
  map?: Map<string, CacheValue<P>>,
  atok?: (x: A) => string
}

export class Cache<A, P> {

  readonly name: string
  readonly map: Map<string, CacheValue<P>>
  readonly log: (s: string, ...args: Array<any>) => void
  readonly atok: (x: A) => string

  constructor(options: CacheOptions<A, P> = {}) {
    this.name = options.name || '<anonymous>'
    this.map = options.map || new Map()
    this.log = debug(`avenger:${this.name}`)
    this.atok = options.atok || JSON.stringify
  }

  get(a: A): CacheValue<P> {
    return this.map.get(this.atok(a)) || empty
  }

  set(a: A, value: CacheValue<P>): Map<string, CacheValue<P>> {
    return this.map.set(this.atok(a), value)
  }

  delete(a: A): boolean {
    this.log('delete(%o)', a)
    return this.map.delete(this.atok(a))
  }

  clear(): void {
    return this.map.clear()
  }

  getAvailablePromise(a: A, strategy: Strategy): Promise<P> | undefined {
    const value = this.get(a)

    if (strategy.isAvailable(value) && typeof value.done !== 'undefined') {
      this.log('getAvailablePromise(%o, %s): returning available done %o', a, String(strategy), value.done)
      return value.done.promise
    }

    if (value.blocked) {
      this.log('getAvailablePromise(%o, %s): returning available promise', a, String(strategy))
      return value.blocked
    }

    this.log('getAvailablePromise(%o, %s): cache miss', a, String(strategy))

    return undefined
  }

  getPromise(a: A, strategy: Strategy, fetch: Fetch<A, P>): Promise<P> {
    const availablePromise = this.getAvailablePromise(a, strategy)
    if (availablePromise) {
      return availablePromise
    }

    this.log('getPromise(%o, %s): fetching and returning related promise', a, String(strategy))
    const promise = fetch(a)
    this.storePromise(a, promise)
    return promise
  }

  storePayload(a: A, p: P, promise: Promise<P>): void {
    const timestamp = new Date().getTime()

    const value: CacheValue<P> = {
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

  storePromise(a: A, promise: Promise<P>): void {
    promise.then(
      p => {
        // quando la promise risolve immagazzino il nuovo payload
        this.storePayload(a, p, promise)
      },
      err => {
        // quando viene rifiutata, pulisco il blocked, a meno che non sia già cambiato
        const value = this.get(a)
        if (value.blocked === promise) {
          delete value.blocked
          this.set(a, value);
        }
        // deve fallire in ogni caso
        throw err;
      }
    )

    // immagazzino il nuovo valore mantenendo il payload presente
    const { done } = this.get(a)
    const value = { done, blocked: promise }
    this.set(a, value)
  }

}
