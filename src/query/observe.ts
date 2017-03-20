import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/of';
import { hasObservers } from './invalidate';
import { Composition, Product, AMap } from '../fetch/operators'
import { ObservableCache, CacheEvent } from './ObservableCache'
import { Cached } from './operators'

export interface ObservableCompositionFetch extends Composition<Product<ObservableFetchMap>, Cached<any, any>> {}

export type ObservableFetchMap = { [key: string]: ObservableFetch }

export type ObservableFetch =
  | Cached<any, any>
  | Product<ObservableFetchMap>
  | ObservableCompositionFetch

export function getObservableFromCached<A, P>(cache: ObservableCache<A, P>, a: A): Observable<CacheEvent<P>> {
  return cache.getSubject(a).filter(e => e.hasOwnProperty('loading'))
}

export function getObservableFromProduct<FS extends ObservableFetchMap>(fetch: Product<FS>, as: AMap<FS>): Observable<{ [K in keyof FS]: CacheEvent<FS[K]['p']> }> {
  return Observable.combineLatest(
    ...fetch.keys.map(k => {
      const f = fetch.fetches[k]
      return observe(f, as[k])
    }),
    (...ps) => fetch.fromArray(ps)
  )
}

export function getObservableFromComposition<F extends ObservableCompositionFetch>(fetch: F, a1: F['master']['a']): Observable<CacheEvent<F['slave']['p']>> {
  const { master, ptoa, slave } = fetch
  const observable = getObservableFromProduct(master, a1)
  return observable.switchMap<F['master']['p'], CacheEvent<F['slave']['p']>>(p1 => {
    const ok = Object.keys(p1).every(k => p1[k].hasOwnProperty('data'))
    if (ok) {
      const data = master.fromArray(Object.keys(p1).map(k => p1[k].data))
      const a2 = ptoa(data, a1)
      const loading = Object.keys(p1).some(k => p1[k].loading)
      if (loading) {
        return Observable.of({
          loading: true,
          data: slave.cache.getSubject(a2).value.data
        })
      }
      // if "slave" is being observed re-fetch it as its A may have changed due to the fetching of its "master"
      Promise.resolve().then(() => {
        if (hasObservers(slave, a2)) {
          slave(a2);
        }
      })

      return getObservableFromCached(slave.cache, a2)
    }
    return Observable.of({ loading: true })
  })
}

export function observe<A, P>(fetch: ObservableFetch, a: A): Observable<CacheEvent<P>> {
  switch (fetch.type) {
    case 'product' :
      return getObservableFromProduct(fetch, a)
    case 'composition' :
      return getObservableFromComposition(fetch, a)
    case 'cached' :
      return getObservableFromCached(fetch.cache, a)
  }
}
