import * as debug from 'debug'
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/distinctUntilChanged'
import { Option, none, some, isSome } from 'fp-ts/lib/Option'
import { sequence } from 'fp-ts/lib/Traversable'
import * as array from 'fp-ts/lib/Array'
import * as option from 'fp-ts/lib/Option'
import { StaticSetoid } from 'fp-ts/lib/Setoid'

const sequenceOptions = sequence(option, array)

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
  readonly done: Option<Done<P>>,
  readonly promise: Option<Promise<P>>
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
  isAvailable<P>(value: CacheValue<P>): boolean {
    return value.done.fold(
      () => false,
      done => !this.isExpired(done.timestamp)
    )
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

export const emptyCacheValue: CacheValue<any> = {
  done: none,
  promise: none
}

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
  private set(a: A, value: CacheValue<P>): Map<string, CacheValue<P>> {
    return this.map.set(this.atok(a), value)
  }
  get(a: A): CacheValue<P> {
    return this.map.get(this.atok(a)) || emptyCacheValue
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

    if (strategy.isAvailable(value) && isSome(value.done)) {
      this.log('getAvailablePromise(%o, %s): returning available done %o', a, String(strategy), value.done)
      return value.done.value.promise
    }

    if (isSome(value.promise)) {
      this.log('getAvailablePromise(%o, %s): returning available promise', a, String(strategy))
      return value.promise.value
    }

    this.log('getAvailablePromise(%o, %s): cache miss', a, String(strategy))
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
  storeDone(a: A, done: Done<P>): void {
    const {
      value: p,
      timestamp,
      promise
    } = done
    const { promise: blocked } = this.get(a)
    this.log('storing %o => %o (ts: %o)', a, p, timestamp)
    // se c'è una promise in flight la mantengo
    if (isSome(blocked) && blocked.value !== promise) {
      this.set(a, {
        done: some(done),
        promise: blocked
      })
    } else {
      this.set(a, {
        done: some(done),
        promise: none
      })
    }
  }
  storePromise(a: A, promise: Promise<P>): void {
    // quando la promise risolve immagazzino il nuovo payload
    promise.then(value => this.storeDone(a, {
      value,
      timestamp: new Date().getTime(),
      promise
    }))

    // immagazzino il nuovo valore mantenendo il payload presente
    const { done } = this.get(a)
    this.set(a, {
      done,
      promise: some(promise)
    })
  }
}

export function cacheFetch<A, P>(fetch: Fetch<A, P>, strategy: Strategy, cache: Cache<A, P>): Fetch<A, P> {
  return (a: A) => cache.getPromise(a, strategy, fetch)
}

export interface CacheEvent<P> {
  readonly loading: boolean,
  readonly data: Option<P>
}

export const setoidCacheEvent: StaticSetoid<CacheEvent<any>> = {
  equals(x, y) {
    if (x === y) {
      return true
    }
    if (x.loading === y.loading && x.data === y.data) {
      return true
    }
    return false
  }
}

const LOADING: Readonly<CacheEvent<any>> = { loading: true, data: none }
const INITIAL_LOADING: Readonly<CacheEvent<any>> = { loading: true, data: none }

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
  storeDone(a: A, done: Done<P>): void {
    super.storeDone(a, done)
    this.emitPayloadEvent(a, done.value)
  }
  storePromise(a: A, promise: Promise<P>): void {
    super.storePromise(a, promise)
    this.emitLoadingEvent(a)
  }
  // TODO override set
  private emitLoadingEvent(a: A): void {
    this.log('emitting LOADING event for %o', a)
    const subject = this.getSubject(a)
    if (isSome(subject.value.data)) {
      subject.next({ loading: true, data: subject.value.data })
    } else {
      subject.next(LOADING)
    }
  }
  private emitPayloadEvent(a: A, p: P): void {
    this.log('emitting PAYLOAD event for %o (payload: %o)', a, p)
    const subject = this.getSubject(a)
    subject.next({
      loading: false,
      data: some(p)
    })
  }
}

export type Dependency<A, P> = {
  fetch: ObservableFetch<any, any>,
  trigger: (p: P, a: A) => void
}

export interface ObservableFetch<A, P> {
  _A: A
  _P: P
  run(a: A, omit?: ObservableFetch<any, any>): Promise<P>
  addDependency(d: Dependency<A, P>): void
  observe(a: A): Observable<CacheEvent<P>>
  getCacheEvent(a: A): CacheEvent<P>
  getPayload(a: A): Option<P>
  hasObservers(a: A): boolean
  invalidate(a: A): void
}

export abstract class BaseObservableFetch<A, P> {
  private dependencies: Array<Dependency<A, P>> = []
  constructor(private readonly fetch: Fetch<A, P>) {}
  run(a: A, omit?: ObservableFetch<any, any>): Promise<P> {
    const promise = this.fetch(a)
    promise.then(p => {
      this.dependencies.forEach(({ fetch, trigger }) => {
        if (fetch !== omit) {
          trigger(p, a)
        }
      })
    })
    return promise
  }
  addDependency(d: Dependency<A, P>): void {
    if (this.dependencies.every(({ fetch }) => fetch !== d.fetch)) {
      this.dependencies.push(d)
    }
  }
}

export class Leaf<A, P> extends BaseObservableFetch<A, P> implements ObservableFetch<A, P> {
  static create<A, P>(fetch: Fetch<A, P>, strategy: Strategy, cache: ObservableCache<A, P>): Leaf<A, P> {
    return new Leaf(fetch, strategy, cache)
  }
  _A: A
  _P: P
  private constructor(
    fetch: Fetch<A, P>,
    strategy: Strategy,
    private readonly cache: ObservableCache<A, P>
  ) {
    super(cacheFetch(fetch, strategy, cache))
  }
  observe(a: A): Observable<CacheEvent<P>> {
    return this.cache.getSubject(a)
      .filter(e => e !== INITIAL_LOADING)
      .distinctUntilChanged(setoidCacheEvent.equals) // TODO remove distinctUntilChanged?
  }
  getCacheEvent(a: A): CacheEvent<P> {
    return this.cache.getSubject(a).value
  }
  getPayload(a: A): Option<P> {
    return this.cache.get(a).done.map(done => done.value);
  }
  hasObservers(a: A): boolean {
    return this.cache.getSubject(a).observers.length > 0
  }
  invalidate(a: A): void {
    this.cache.delete(a)
  }
}

export class Composition<A1, P1, A2, P2> extends BaseObservableFetch<A1, P2> implements ObservableFetch<A1, P2> {
  static create<A1, P1, A2, P2>(master: ObservableFetch<A1, P1>, ptoa: (p1: P1, a1: A1) => A2, slave: ObservableFetch<A2, P2>): Composition<A1, P1, A2, P2> {
    return new Composition(master, ptoa, slave)
  }
  _A: A1
  _P: P2
  private constructor(
    private readonly master: ObservableFetch<A1, P1>,
    private readonly ptoa: (p1: P1, a1: A1) => A2,
    private readonly slave: ObservableFetch<A2, P2>
  ) {
    super(a1 => this.master.run(a1, this.slave).then(p1 => this.slave.run(this.ptoa(p1, a1))))
    master.addDependency({
      fetch: this.slave,
      trigger: (p1: P1, a1: A1) => { 
        const a2 = this.ptoa(p1, a1)
        if (this.slave.hasObservers(a2)) {
          this.slave.run(a2)
        }
      }
    })
  }
  observe(a1: A1): Observable<CacheEvent<P2>> {
    return this.master.observe(a1)
      .switchMap<CacheEvent<P1>, CacheEvent<P2>>(cep1 => cep1.data.fold(
        () => Observable.of(LOADING),
        p1 => this.slave.observe(this.ptoa(p1, a1))
      ))
      .distinctUntilChanged(setoidCacheEvent.equals) // TODO remove distinctUntilChanged?
  }
  getCacheEvent(a1: A1): CacheEvent<P2> {
    return this.master.getCacheEvent(a1).data.fold(
      () => LOADING,
      p1 => this.slave.getCacheEvent(this.ptoa(p1, a1))
    )
  }
  getPayload(a1: A1): Option<P2> {
    return this.master.getPayload(a1)
      .chain(p1 => this.slave.getPayload(this.ptoa(p1, a1)))
  }
  hasObservers(a1: A1): boolean {
    return this.master.getCacheEvent(a1).data.fold(
      () => false,
      p1 => this.slave.hasObservers(this.ptoa(p1, a1))
    )
  }
  invalidate(a1: A1): void {
    this.master.getPayload(a1).map(p1 => {
      const a2 = this.ptoa(p1, a1)
      this.master.invalidate(a1)
      this.slave.invalidate(a2)
    })
  }
}

export class Product<A extends Array<any>, P extends Array<any>>  extends BaseObservableFetch<A, P> implements ObservableFetch<A, P> {
  // TODO more overloadings and maybe convert to normal constructor
  static create<A1, P1, A2, P2, A3, P3>(fetches: [ObservableFetch<A1, P1>, ObservableFetch<A2, P2>, ObservableFetch<A3, P3>]): Product<[A1, A2, A3], [P1, P2, P3]>
  static create<A1, P1, A2, P2>(fetches: [ObservableFetch<A1, P1>, ObservableFetch<A2, P2>]): Product<[A1, A2], [P1, P2]>
  static create<A1, P1>(fetches: [ObservableFetch<A1, P1>]): Product<[A1], [P1]>
  static create(fetches: Array<ObservableFetch<any, any>>): Product<Array<any>, Array<any>>
  static create(fetches: Array<ObservableFetch<any, any>>): Product<Array<any>, Array<any>> {
    return new Product(fetches)
  }
  _A: A
  _P: P
  private constructor(private readonly fetches: Array<ObservableFetch<any, any>>) {
    super(a => Promise.all(this.fetches.map((fetch, i) => fetch.run(a[i]))))
  }
  observe(a: A): Observable<CacheEvent<P>> {
    return Observable.combineLatest(...this.fetches.map((fetch, i) => fetch.observe(a[i])), (...values) => {
      const loading = values.some(v => v.loading === true)
      if (values.every(v => isSome(v.data))) {
        const os = values.map(v => v.data)
        const o = sequenceOptions(os)
        return {
          loading,
          data: o
        }
      } else {
        return LOADING
      }
    }).distinctUntilChanged(setoidCacheEvent.equals) // TODO remove distinctUntilChanged?
  }
  getCacheEvent(a: A): CacheEvent<P> {
    const os = this.fetches.map((fetch, i) => fetch.getCacheEvent(a[i]).data)
    const o = sequenceOptions(os)
    return {
      loading: isSome(o),
      data: o as any
    }
  }
  getPayload(a: A): Option<P> {
    const os = this.fetches.map((fetch, i) => fetch.getPayload(a[i]))
    const o = sequenceOptions(os)
    return o as any
  }
  hasObservers(a: A): boolean {
    return this.fetches.some((fetch, i) => fetch.hasObservers(a[i]))
  }
  invalidate(a: A): void {
    this.fetches.forEach((f, i) => f.invalidate(a[i]))
  }
}

export function query<A, P>(fetch: ObservableFetch<A, P>, a: A): Observable<CacheEvent<P>> {
  const observable = fetch.observe(a)
  fetch.run(a)
  return observable
}

export function querySync<A, P>(fetch: ObservableFetch<A, P>, a: A): CacheEvent<P> {
  return fetch.getCacheEvent(a)
}

export type Queries = { [key: string]: ObservableFetch<any, any> }

export type QueriesArguments<Q extends Queries> = { readonly [K in keyof Q]: Q[K]['_A'] }

export type QueriesCacheEvents<Q extends Queries> = Observable<CacheEvent<{ readonly [K in keyof Q]: Q[K]['_P'] }>>

export function apply<Q extends Queries>(queries: Q, args: QueriesArguments<Q>): QueriesCacheEvents<Q> {
  // unsafe code
  const itok = Object.keys(args)
  const fetches = itok.map(k => queries[k])
  const as = itok.map(k => args[k])
  const product = Product.create(fetches)
  const x = query(product, as).map(({ loading, data }) => data.fold(
    () => LOADING,
    ps => {
      const dataMap: { [key: string]: any } = {}
      itok.forEach((k, i) => { dataMap[k] = ps[i] })
      return {
        loading,
        data: some(dataMap)
      }
    }
  ))
  return x as any
}
