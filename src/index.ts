import * as debug from 'debug'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/observable/combineLatest'
import 'rxjs/add/observable/of'
import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/switchMap'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/distinctUntilChanged'
import { Option, none, some, isSome } from 'fp-ts/lib/Option'
import * as traversable from 'fp-ts/lib/Traversable'
import * as array from 'fp-ts/lib/Array'
import * as option from 'fp-ts/lib/Option'
import { identity } from 'fp-ts/lib/function'
import * as t from 'io-ts'

const sequenceOptions = traversable.sequence(option, array)

export type Fetch<A, P> = (a: A) => Promise<P>

export class Done<P> {
  constructor(
    /** il valore restituito dalla promise contenuta nel campo `promise` una volta risolta */
    public readonly value: P,
    /** il momento in cui è stato valorizzato value */
    public readonly timestamp: number,
    /** la promise che conteneva il valore */
    public readonly promise: Promise<P>
  ) {}
}

export class CacheValue<P> {
  static empty = new CacheValue<any>(none, none)
  constructor(
    public readonly done: Option<Done<P>>,
    public readonly promise: Option<Promise<P>>
  ) {}
}

export interface Strategy {
  isAvailable<P>(value: CacheValue<P>): boolean
}

// questa strategia esegue una fetch se non c'è un done oppure se il done presente è scaduto
export class Expire {
  constructor(
    public delay: number
  ) {}
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
    const k = this.atok(a)
    this.log('set key `%s`', k)
    return this.map.set(k, value)
  }
  get(a: A): CacheValue<P> {
    return this.map.get(this.atok(a)) || CacheValue.empty
  }
  delete(a: A): boolean {
    const k = this.atok(a)
    this.log('delete key `%s`', k)
    return this.map.delete(k)
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
      this.set(a, new CacheValue(some(done), blocked))
    } else {
      this.set(a, new CacheValue(some(done), none))
    }
  }
  storePromise(a: A, promise: Promise<P>): void {
    // quando la promise risolve immagazzino il nuovo payload
    promise.then(value => this.storeDone(a, new Done(value, new Date().getTime(), promise)))

    // immagazzino il nuovo valore mantenendo il payload presente
    const { done } = this.get(a)
    this.set(a, new CacheValue(done, some(promise)))
  }
}

export function cacheFetch<A, P>(fetch: Fetch<A, P>, strategy: Strategy, cache: Cache<A, P>): Fetch<A, P> {
  return (a: A) => cache.getPromise(a, strategy, fetch)
}

/** CacheEvent possiede un'istanza di
 * - Functor
 * - Setoid
 */
export class CacheEvent<P> {
  constructor(
    public readonly loading: boolean,
    public readonly data: Option<P>
  ) {}
  map<B>(f: (a: P) => B): CacheEvent<B> {
    return new CacheEvent(this.loading, this.data.map(f))
  }
  equals(y: CacheEvent<P>): boolean {
    if (this === y) {
      return true
    }
    if (this.loading === y.loading && this.data === y.data) {
      return true
    }
    return false
  }
}

const LOADING = new CacheEvent<any>(true, none)

// INITIAL_LOADING, pur essendo identico come contenuto,
// deve avere una reference diversa da LOADING per poter essere
// distinguibile nella filter di observe
const INITIAL_LOADING = new CacheEvent<any>(true, none)

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
      subject.next(new CacheEvent(true, subject.value.data))
    } else {
      subject.next(LOADING)
    }
  }
  private emitPayloadEvent(a: A, p: P): void {
    this.log('emitting PAYLOAD event for %o (payload: %o)', a, p)
    const subject = this.getSubject(a)
    subject.next(new CacheEvent(false, some(p)))
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

export class BaseObservableFetch<A, P> {
  _A: A
  _P: P
  private dependencies: Array<Dependency<A, P>> = []
  constructor(
    protected readonly fetch: Fetch<A, P>
  ) {}
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
      .distinctUntilChanged((x, y) => x.equals(y)) // TODO remove distinctUntilChanged?
  }
  getCacheEvent(a: A): CacheEvent<P> {
    return this.cache.getSubject(a).value
  }
  getPayload(a: A): Option<P> {
    return this.cache.get(a).done.map(done => done.value)
  }
  hasObservers(a: A): boolean {
    return this.cache.getSubject(a).observers.length > 0
  }
  invalidate(a: A): void {
    this.cache.delete(a)
  }
}

export class Composition<A1, P1, A2, P2> extends BaseObservableFetch<A1, P2> implements ObservableFetch<A1, P2> {
  static create<A1, P1, A2, P2>(master: ObservableFetch<A1, P1>, slave: ObservableFetch<A2, P2>): (ptoa: (p1: P1, a1: A1) => A2) => Composition<A1, P1, A2, P2> {
    return ptoa => new Composition(master, ptoa, slave)
  }
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
      .distinctUntilChanged((x, y) => x.equals(y)) // TODO remove distinctUntilChanged?
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

export class Product<A extends Array<any>, P extends Array<any>> extends BaseObservableFetch<A, P> implements ObservableFetch<A, P> {
  // TODO more overloadings and maybe convert to normal constructor
  static create<A1, P1, A2, P2, A3, P3>(fetches: [ObservableFetch<A1, P1>, ObservableFetch<A2, P2>, ObservableFetch<A3, P3>]): Product<[A1, A2, A3], [P1, P2, P3]>
  static create<A1, P1, A2, P2>(fetches: [ObservableFetch<A1, P1>, ObservableFetch<A2, P2>]): Product<[A1, A2], [P1, P2]>
  static create<A1, P1>(fetches: [ObservableFetch<A1, P1>]): Product<[A1], [P1]>
  static create(fetches: Array<ObservableFetch<any, any>>): Product<Array<any>, Array<any>> // TODO si può levare?
  static create(fetches: Array<ObservableFetch<any, any>>): Product<Array<any>, Array<any>> {
    return new Product(fetches)
  }
  private constructor(
    private readonly fetches: Array<ObservableFetch<any, any>>
    ) {
    super(a => Promise.all(this.fetches.map((fetch, i) => fetch.run(a[i]))))
  }
  observe(a: A): Observable<CacheEvent<P>> {
    return Observable.combineLatest(...this.fetches.map((fetch, i) => fetch.observe(a[i])), (...values) => {
      const loading = values.some(v => v.loading === true)
      if (values.every(v => isSome(v.data))) {
        const os = values.map(v => v.data)
        const o = sequenceOptions(os)
        return new CacheEvent(loading, o)
      } else {
        return LOADING
      }
    }).distinctUntilChanged((x, y) => x.equals(y)) // TODO remove distinctUntilChanged?
  }
  getCacheEvent(a: A): CacheEvent<P> {
    const os = this.fetches.map((fetch, i) => fetch.getCacheEvent(a[i]).data)
    const o = sequenceOptions(os)
    return new CacheEvent<P>(!isSome(o), o as any)
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

export class Bimap<A1, P1, A2, P2> extends BaseObservableFetch<A2, P2> implements ObservableFetch<A2, P2> {
  constructor(
    private readonly observableFetch: ObservableFetch<A1, P1>,
    private readonly a2toa1: (a1: A2) => A1,
    private readonly p1top2: (p1: P1) => P2
  ) {
    super(a2 => observableFetch.run(a2toa1(a2)).then(p1 => p1top2(p1)))
  }
  observe(a2: A2): Observable<CacheEvent<P2>> {
    return this.observableFetch.observe(this.a2toa1(a2)).map(cep1 => cep1.map(this.p1top2))
  }
  getCacheEvent(a2: A2): CacheEvent<P2> {
    return this.observableFetch.getCacheEvent(this.a2toa1(a2)).map(this.p1top2)
  }
  getPayload(a2: A2): Option<P2> {
    return this.observableFetch.getPayload(this.a2toa1(a2)).map(this.p1top2)
  }
  hasObservers(a2: A2): boolean {
    return this.observableFetch.hasObservers(this.a2toa1(a2))
  }
  invalidate(a2: A2): void {
    this.observableFetch.invalidate(this.a2toa1(a2))
  }
}

export type Dictionary = { [key: string]: any }

/** Concatenable observable fetch */
export type COF<A extends Dictionary, P extends Dictionary> = ObservableFetch<A, P>

export type AnyCOF = COF<any, any>

// TODO more overloadings
export function concat<F1 extends AnyCOF, F2 extends AnyCOF, F3 extends AnyCOF, F4 extends AnyCOF>(fetches: [F1, F2, F3, F4]): COF<F1['_A'] & F2['_A'] & F3['_A'] & F4['_A'], F1['_P'] & F2['_P'] & F3['_P'] & F4['_P']>
export function concat<F1 extends AnyCOF, F2 extends AnyCOF, F3 extends AnyCOF>(fetches: [F1, F2, F3]): COF<F1['_A'] & F2['_A'] & F3['_A'], F1['_P'] & F2['_P'] & F3['_P']>
export function concat<F1 extends AnyCOF, F2 extends AnyCOF, F3 extends AnyCOF>(fetches: [F1, F2, F3]): COF<F1['_A'] & F2['_A'] & F3['_A'], F1['_P'] & F2['_P'] & F3['_P']>
export function concat<F1 extends AnyCOF, F2 extends AnyCOF>(fetches: [F1, F2]): COF<F1['_A'] & F2['_A'], F1['_P'] & F2['_P']>
export function concat(fetches: Array<AnyCOF>): AnyCOF {
  // non c'è bisogno di fare un check sui conflitti perchè il tipo che ne risulta non è
  // utilizzabile a valle quindi verrà sollevato un errore appena si prova ad utilizzare
  // il risultato, a meno che tutti i tipi coincidano
  return new Bimap(
    Product.create(fetches),
    a2 => fetches.map(() => a2),
    ps => Object.assign.apply(null, [{}].concat(ps))
  )
}

//
// =========================
//

function observeAndRun<A, P>(fetch: ObservableFetch<A, P>, a: A): Observable<CacheEvent<P>> {
  const observable = fetch.observe(a)
  fetch.run(a)
  return observable
}

export type ObservableFetchDictionary = { [key: string]: ObservableFetch<any, any> }

export type ObservableFetchesArguments<D extends ObservableFetchDictionary> = { readonly [K in keyof D]: D[K]['_A'] }

export type ObservableFetchesCacheEvents<D extends ObservableFetchDictionary> = { readonly [K in keyof D]: CacheEvent<D[K]['_P']> }

/** Dato un dizionario di ObservableFetch restituisce un Observable del dizionario dei CacheEvent corrispondenti */
export function sequence<D extends ObservableFetchDictionary>(fetches: D, as: ObservableFetchesArguments<D>): Observable<ObservableFetchesCacheEvents<D>> {
  const itok = Object.keys(fetches)
  const observables = itok.map(k => observeAndRun(fetches[k], as[k]))
  return Observable.combineLatest(...observables, (...values) => {
    const out: { [key: string]: CacheEvent<any> } = {}
    itok.forEach((k, i) => {
      out[k] = values[i]
    })
    return out as any
  })
}

/** Dato un dizionario di ObservableFetch restituisce il dizionario dei CacheEvent corrispondenti */
export function sequenceSync<D extends ObservableFetchDictionary>(fetches: D, as: ObservableFetchesArguments<D>): ObservableFetchesCacheEvents<D> {
  const out: { [key: string]: CacheEvent<any> } = {}
  for (let k in fetches) {
    out[k] = fetches[k].getCacheEvent(as[k])
  }
  return out as any
}

//
// DSL -> ObservableFetch
//

export type Queries = { [key: string]: Query<any, any, any> }

export interface Query<Params extends t.Props, Deps extends Queries, P> extends ObservableFetch<{ [K in keyof Params]: t.TypeOf<Params[K]> } & { [K in keyof Deps]: Deps[K]['_A'] }, P> {
  params: Params,
  dependencies: Deps
}

/** Data una configurazione appartenente al DSL restituisce la ObservableFetch corrispondente */
export function Query<Params extends t.Props, Deps extends Queries, P>(options: {
  cacheStrategy: Strategy,
  params: Params,
  fetch: Fetch<{ [K in keyof Params]: t.TypeOf<Params[K]> } & { [K in keyof Deps]: Deps[K]['_P'] }, P>,
  dependencies: Deps,
  atok?: (x: { [K in keyof Params]: t.TypeOf<Params[K]> } & { [K in keyof Deps]: Deps[K]['_P'] }) => string
}): Query<Params, Deps, P>
export function Query<Params extends t.Props, P>(options: { // TODO togliere Params?
  cacheStrategy: Strategy,
  params: Params,
  fetch: Fetch<{ [K in keyof Params]: t.TypeOf<Params[K]> }, P>
}): Query<Params, {}, P>
export function Query<Params extends t.Props, Deps extends Queries, P>(options: {
  cacheStrategy: Strategy,
  params: Params,
  fetch: Fetch<{ [K in keyof Params]: t.TypeOf<Params[K]> } & { [K in keyof Deps]: Deps[K]['_P'] }, P>,
  dependencies?: Deps,
  atok?: (x: { [K in keyof Params]: t.TypeOf<Params[K]> } & { [K in keyof Deps]: Deps[K]['_P'] }) => string
}): Query<Params, Deps, P> {

  const dependencies: Deps = options.dependencies || ({} as Deps)
  const keys = Object.keys(dependencies)
  const keysLength = keys.length
  const leaf = Leaf.create(options.fetch, options.cacheStrategy, new ObservableCache<any, P>({ atok: options.atok }))

  const createQuery = () => {
    if (keysLength === 0) {
      return leaf
    } else {
      const fetches: ObservableFetch<any[], any[]>[] = keys.map(k => dependencies[k])
      const params = options.params
      const paramsLength = Object.keys(params).length
      if (paramsLength > 0) {
        const paramsFetch = Leaf.create(a => Promise.resolve(a), refetch, new ObservableCache<any, P>())
        fetches.push(paramsFetch)
      }
      const product = Product.create(fetches)
      const composition = Composition.create(
        product,
        leaf
      )(p => {
        const a: { [key: string]: any } = {}
        keys.forEach((k, i) => {
          a[k] = p[i]
        })
        if (paramsLength > 0) {
          for (let k in params) {
            a[k] = p[keysLength][k]
          }
        }
        return a
      })
      const a2toa1 = (a2: any) => {
        const a1 = keys.map(k => a2[k])
        if (paramsLength > 0) {
          a1.push(a2)
        }
        return a1
      }
      return new Bimap(composition, a2toa1, identity)
    }
  }

  const out: any = createQuery()
  out.params = options.params
  out.dependencies = dependencies
  return out
}
