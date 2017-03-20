import 'rxjs/add/operator/distinctUntilChanged'
// import { CacheEvent } from './ObservableCache'
import { observe, ObservableFetch, ObservableProduct } from './observe'
import { Observable } from 'rxjs/Observable';
import { CacheEvent } from './ObservableCache'
import { Cached } from './operators'
import { AMap } from '../fetch/operators'

// avoid as much as possible deep comparisons
// by just diffing on (nested) `loading` keys
// function isEqual<P>(a: CacheEvent<P>, b: CacheEvent<P>) { // TODO
function isEqual(a: any, b: any) { // TODO
  if (a.loading !== b.loading) {
    return false
  }

  for (const k in b) { // eslint-disable-line no-loops/no-loops
    if (k !== 'loading' && b[k] && typeof b[k] === 'object' && b[k].hasOwnProperty('loading')) {
      if (!isEqual(a[k], b[k])) {
        return false
      }
    }
  }

  return true
}

export function query<A, P>(fetch: ObservableFetch, a: A): Observable<CacheEvent<P>> {
  const observer = observe(fetch, a).distinctUntilChanged(isEqual)
  fetch(a)
  return observer
}

function querySyncFromCached<A, P>(fetch: Cached<A, P>, a: A): CacheEvent<P> {
  return fetch.cache.getSubject(a).value
}

function querySyncFromProduct<F extends ObservableProduct>(fetch: F, as: AMap<F['fetches']>): { [K in keyof F['fetches']]: CacheEvent<F['fetches'][K]['p']> } {
  const events = fetch.keys.map((k, i) => querySync(fetch.fetches[k], as[k]))
  const o: any = {}
  events.forEach((e, i) => {
    o[fetch.keys[i]] = e
  })
  return o
}

export function querySync<A, P>(fetch: ObservableFetch, a: A): CacheEvent<P> {

  switch (fetch.type) {
    case 'product' :
      return querySyncFromProduct(fetch, a)
    case 'composition' :
      throw 'err'
    case 'cached' :
      return querySyncFromCached(fetch, a)
  }

  // if (fetch.type === 'composition') {
  //   const { master, slave, ptoa } = fetch
  //   const isProduct = ( master.type === 'product' )
  //   const x = querySync(master, a);
  //   const ok = isProduct ? x.every(xi => xi.hasOwnProperty('data')) : x.hasOwnProperty('data')
  //   if (ok) {
  //     const data = isProduct ? x.map(xi => xi.data) : x.data
  //     const a1 = ptoa(data, a)
  //     const loading = isProduct ? x.some(xi => xi.loading) : x.loading
  //     if (loading) {
  //       return {
  //         loading: true,
  //         data: slave.cache.getSubject(a1).value.data
  //       }
  //     }
  //     return slave.cache.getSubject(a1).value
  //   }
  //   return { loading: true }
  // }

}
