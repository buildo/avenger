import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/of';
import { hasObservers } from './invalidate';
import { Composition, Product } from '../fetch/operators'
import { ObservableCache, CacheEvent } from './ObservableCache'
import { CachedFetch } from './operators'

interface ObservableFetches extends Array<ObservableFetch<any, any>> {}

interface ObservableCompositionFetch<A, P> extends Composition<ObservableFetch<any, any>, ObservableFetch<any, any>, A, any, any, P> {}

type ObservableFetch<A, P> =
  | CachedFetch<A, P>
  | Product<A, P, ObservableFetches>
  | ObservableCompositionFetch<A, P>

function observeCachedFetch<A, P>(cache: ObservableCache<A, P, A>, a: A): Observable<CacheEvent<P>> {
  return cache.getSubject(a).filter(e => e.hasOwnProperty('loading'))
}

function observeProductFetch<A, P, FS extends ObservableFetches>(fetch: Product<A, P, FS>, as: A): Observable<Array<CacheEvent<any>>> {
  // fix https://github.com/ReactiveX/rxjs/issues/1686
  return Observable.combineLatest(...fetch.fetches.map((fetch, i) => observe(fetch, (as as any)[i])), (...values) => values)
}

function observeCompositionFetch<A, P>(fetch: ObservableCompositionFetch<A, P>, a: A): Observable<CacheEvent<P>> {
  const { master, slave, ptoa } = fetch
  const isProduct = ( master.type === 'product' )
  const observable = observe<A, P>(master, a)
  return observable.switchMap<CacheEvent<P>, CacheEvent<P>>(x => {
    const ok = isProduct ? x.every(xi => xi.hasOwnProperty('data')) : x.hasOwnProperty('data')
    if (ok) {
      const data = isProduct ? x.map(xi => xi.data) : x.data
      const a1 = ptoa(data, a)
      const loading = isProduct ? x.some(xi => xi.loading) : x.loading
      if (loading) {
        return Observable.of({
          loading: true,
          data: slave.cache.getSubject(a1).value.data
        })
      }

      // if "slave" is being observed re-fetch it as its A may have changed due to the fetching of its "master"
      Promise.resolve().then(() => {
        if (hasObservers(slave, a1)) {
          slave(a1);
        }
      })

      return observeCachedFetch(slave.cache, a1)
    }
    return Observable.of({ loading: true })
  })
}

export function observe<A, P>(fetch: ObservableFetch<A, P>, a: A): Observable<CacheEvent<P>> {
  switch (fetch.type) {
    case 'product' :
      return observeProductFetch(fetch, a)
    case 'composition' :
      return observeCompositionFetch(fetch, a)
    case 'cached' :
      return observeCachedFetch(fetch.cache, a)
  }
}
