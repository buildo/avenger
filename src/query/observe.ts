import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/of';
import { hasObservers } from './invalidate';
import { Composition, Product, AMap } from '../fetch/operators'
import { ObservableCache, CacheEvent } from './ObservableCache'
import { Cached } from './operators'

export interface ObservableCompositionFetch<A, P> extends Composition<ObservableProduct, Cached<any, P>, A, any, any, P> {}

export type ObservableProduct = Product<{ [key: string]: ObservableFetch<any, any> }>

export type ObservableFetch<A, P> =
  | Cached<A, P>
  | ObservableProduct
  | ObservableCompositionFetch<A, P>

function observeCached<A, P>(cache: ObservableCache<A, P>, a: A): Observable<CacheEvent<P>> {
  return cache.getSubject(a).filter(e => e.hasOwnProperty('loading'))
}

function observeProduct<FS extends { [key: string]: ObservableFetch<any, any> }>(fetch: Product<FS>, as: AMap<FS>): Observable<{ [K in keyof FS]: CacheEvent<FS[K]['p']> }> {
  return Observable.combineLatest(...fetch.keys.map(k => observe(fetch.fetches[k], as[k])), (...ps) => fetch.fromArray(ps))
}

function observeComposition<A, P>(fetch: ObservableCompositionFetch<A, P>, a: A): Observable<CacheEvent<P>> {
  const { master, ptoa, slave } = fetch
  return observe(master, a).switchMap((x: typeof master.p) => {
    const ok = Object.keys(x).every(k => x[k].hasOwnProperty('data'))
    if (ok) {
      const data = master.fromArray(Object.keys(x).map(k => x[k].data))
      const a2 = ptoa(data, a)
      const loading = Object.keys(x).some(k => x[k].loading)
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

      // return observeCached(slave.cache, a2)
    }
    return Observable.of({ loading: true })
  })
}

export function observe<A, P>(fetch: ObservableFetch<A, P>, a: A): Observable<CacheEvent<P>> {
  switch (fetch.type) {
    case 'product' :
      return observeProduct(fetch, a)
    case 'composition' :
      return observeComposition(fetch, a)
    case 'cached' :
      return observeCached(fetch.cache, a)
  }
}
