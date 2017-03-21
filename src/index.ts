import * as debug from 'debug'
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/skip';
import 'rxjs/add/operator/distinctUntilChanged'

export type Fetch<A, P> = (a: A) => Promise<P>

export interface Done<P> {
  /** il valore contenuto nella promise */
  readonly value: P,
  /** il momento in cui è stato valorizzato done */
  readonly timestamp: number,
  /** la promise che conteneva il done */
  readonly promise: Promise<P>
}

export interface CacheValue<P> {
  readonly done?: Done<P>,
  readonly blocked?: Promise<P>
}

export interface Strategy {
  isAvailable<P>(value: CacheValue<P>): boolean
}

// questa strategia esegue una fetch se non c'è un done oppure se il done presente è troppo vecchio
export class Expire {
  constructor(public delay: number) {}
  isExpired(time: number) {
    const delta = new Date().getTime() - time
    // prendo in considerazione tempi futuri
    if (delta < 0) {
      return false
    }
    return delta >= this.delay
  }
  isAvailable<P>(value: CacheValue<P>): value is { done: Done<P> } {
    return typeof value.done !== 'undefined' && !this.isExpired(value.done.timestamp)
  }
  toString() {
    if (this.delay === -1) {
      return 'Refetch'
    }
    if (this.delay === Infinity) {
      return 'Available'
    }
    return `Expire(${this.delay})`
  }
}

// questa strategia esegue sempre la fetch a meno che non ce ne sia una ongoing
// e non restituisce mai un done
export const refetch = new Expire(-1)

// questa strategia esegue una fetch solo se non c'è né un done né un blocked
export const available = new Expire(Infinity)

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
    const done: Done<P> = {
      value: p,
      timestamp,
      promise
    }
    const { blocked } = this.get(a)
    this.log('storing %o => %o (ts: %o)', a, p, timestamp)
    // se c'è una promise in flight la mantengo
    if (blocked !== promise) {
      this.set(a, { done, blocked })
    } else {
      this.set(a, { done })
    }
  }
  storePromise(a: A, promise: Promise<P>): void {
    // quando la promise risolve immagazzino il nuovo payload
    promise.then(p => this.storePayload(a, p, promise))

    // immagazzino il nuovo valore mantenendo il payload presente
    const { done } = this.get(a)
    const value = { done, blocked: promise }
    this.set(a, value)
  }
}

export function cacheFetch<A, P>(fetch: Fetch<A, P>, strategy: Strategy, cache: Cache<A, P>): Fetch<A, P> {
  return (a: A) => cache.getPromise(a, strategy, fetch)
}

export interface CacheEvent<P> {
  readonly loading: boolean,
  readonly data?: P
}

const LOADING: CacheEvent<any> = { loading: true }
const INITIAL_LOADING: CacheEvent<any> = { loading: true }

export class ObservableCache<A, P> extends Cache<A, P> {
  readonly subjects: { [key: string]: BehaviorSubject<CacheEvent<P>> }
  constructor(options: CacheOptions<A, P> = {}) {
    super(options)
    this.subjects = {}
  }
  getSubject(a: A): BehaviorSubject<CacheEvent<P>> {
    const k = this.atok(a)
    if (!this.subjects.hasOwnProperty(k)) {
      this.log('creating ReplaySubject for %o', a)
      this.subjects[k] = new BehaviorSubject(INITIAL_LOADING)
    }
    return this.subjects[k]
  }
  storePayload(a: A, p: P, promise: Promise<P>): void {
    super.storePayload(a, p, promise)
    this.emitPayloadEvent(a, p)
  }
  storePromise(a: A, promise: Promise<P>): void {
    super.storePromise(a, promise)
    this.emitLoadingEvent(a)
  }
  emitLoadingEvent(a: A): void {
    this.log('emitting LOADING event for %o', a)
    const subject = this.getSubject(a)
    if (subject.value.hasOwnProperty('data')) {
      subject.next({ loading: true, data: subject.value.data })
    } else {
      subject.next(LOADING)
    }
  }
  emitPayloadEvent(a: A, p: P): void {
    this.log('emitting PAYLOAD event for %o (payload: %o)', a, p)
    const subject = this.getSubject(a)
    subject.next({
      loading: false,
      data: p
    })
  }
}

export interface ObservableFetch<A, P> {
  readonly fetch: Fetch<A, P>
  observe(a: A): Observable<CacheEvent<P>>
  getCacheEvent(a: A): CacheEvent<P>
  // hasObservers(a: A): Promise<boolean>
}

export class Leaf<A, P> implements ObservableFetch<A, P> {
  static create<A, P>(fetch: Fetch<A, P>, strategy: Strategy, cache: ObservableCache<A, P>): Leaf<A, P> {
    return new Leaf(fetch, strategy, cache)
  }
  readonly fetch: Fetch<A, P>
  private constructor(
    fetch: Fetch<A, P>,
    strategy: Strategy,
    private readonly cache: ObservableCache<A, P>
  ) {
    this.fetch = cacheFetch(fetch, strategy, cache)
  }
  observe(a: A): Observable<CacheEvent<P>> {
    return this.cache.getSubject(a).filter(e => e !== INITIAL_LOADING).distinctUntilChanged(isEqual)
  }
  getCacheEvent(a: A): CacheEvent<P> {
    return this.cache.getSubject(a).value
  }
  // hasObservers(a: A): Promise<boolean> {
  //   return Promise.resolve(this.cache.getSubject(a).observers.length > 0)
  // }
}

export class Composition<A1, P1, A2, P2> implements ObservableFetch<A1, P2> {
  static create<A1, P1, A2, P2>(master: ObservableFetch<A1, P1>, ptoa: (p1: P1, a1?: A1) => A2, slave: ObservableFetch<A2, P2>): Composition<A1, P1, A2, P2> {
    return new Composition(master, ptoa, slave)
  }
  readonly fetch: Fetch<A1, P2>
  private constructor(
    private readonly master: ObservableFetch<A1, P1>,
    private readonly ptoa: (p1: P1, a1?: A1) => A2,
    private readonly slave: ObservableFetch<A2, P2>
  ) {
    this.fetch = a1 => this.master.fetch(a1).then(p1 => this.slave.fetch(this.ptoa(p1, a1)))
  }
  observe(a1: A1): Observable<CacheEvent<P2>> {
    return this.master.observe(a1).switchMap<CacheEvent<P1>, CacheEvent<P2>>(cep1 => {
      if (typeof cep1.data !== 'undefined') {
        const a2 = this.ptoa(cep1.data, a1)
        // this.slave.fetch(a2)
        return this.slave.observe(a2)
      } else {
        return Observable.of(LOADING)
      }
    }).distinctUntilChanged(isEqual)
  }
  getCacheEvent(a1: A1): CacheEvent<P2> {
    const cep1 = this.master.getCacheEvent(a1)
    if (typeof cep1.data !== 'undefined') {
      const a2 = this.ptoa(cep1.data, a1)
      return this.slave.getCacheEvent(a2)
    } else {
      return LOADING
    }
  }
  // hasObservers(a1: A1): Promise<boolean> {
  //   return this.master.fetch(a1).then(p1 => this.ptoa(p1)).then(a2 => this.slave.hasObservers(a2))
  // }
}

export class Product<A extends Array<any>, P extends Array<any>>  implements ObservableFetch<A, P> {
  // TODO more overloadings
  static create<A1, P1, A2, P2, A3, P3>(fetches: [ObservableFetch<A1, P1>, ObservableFetch<A2, P2>, ObservableFetch<A3, P3>]): Product<[A1, A2, A3], [P1, P2, P3]>
  static create<A1, P1, A2, P2>(fetches: [ObservableFetch<A1, P1>, ObservableFetch<A2, P2>]): Product<[A1, A2], [P1, P2]>
  static create<A1, P1>(fetches: [ObservableFetch<A1, P1>]): Product<[A1], [P1]>
  static create(fetches: Array<ObservableFetch<any, any>>): Product<Array<any>, Array<any>> {
    return new Product(fetches)
  }
  readonly fetch: Fetch<A, P>
  private constructor(private readonly fetches: Array<ObservableFetch<any, any>>) {
    this.fetch = a => Promise.all(this.fetches.map((fetch, i) => fetch.fetch(a[i])))
  }
  observe(a: A): Observable<CacheEvent<P>> {
    return Observable.combineLatest(...this.fetches.map((fetch, i) => fetch.observe(a[i])), (...values) => {
      const loading = values.some(v => v.loading === true)
      if (values.every(v => v.hasOwnProperty('data'))) {
        return {
          loading,
          data: values.map(v => v.data) as any
        }
      } else {
        return LOADING
      }
    }).distinctUntilChanged(isEqual)
  }
  getCacheEvent(a: A): CacheEvent<P> {
    const values = this.fetches.map((fetch, i) => fetch.getCacheEvent(a[i]))
    const loading = values.some(v => v.loading === true)
    if (values.every(v => v.hasOwnProperty('data'))) {
      return {
        loading,
        data: values.map(v => v.data) as any
      }
    } else {
      return { loading }
    }
  }
  // hasObservers(a: A): Promise<boolean> {
  //   return Promise.all(this.fetches.map((fetch, i) => fetch.hasObservers(a[i]))).then(bs => bs.some(b => b))
  // }
}

function isEqual<P>(a: CacheEvent<P>, b: CacheEvent<P>) {
  if (a === b) {
    return true
  }
  if (a.loading === b.loading && a.data === b.data) {
    return true
  }
  return false
}

export function query<A, P>(fetch: ObservableFetch<A, P>, a: A): Observable<CacheEvent<P>> {
  const observable = fetch.observe(a)
  fetch.fetch(a)
  return observable
}

export function querySync<A, P>(fetch: ObservableFetch<A, P>, a: A): CacheEvent<P> {
  return fetch.getCacheEvent(a)
}
