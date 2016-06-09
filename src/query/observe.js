// TODO add Flow

import type {
  FetchT
} from '../fetch/operators'

import type {
  CachedFetchT
} from './operators'

import type {
  ObservableCache
} from './ObservableCache'

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/of';

function observeCache<A, P>(cache: ObservableCache<A, P>, a: A) {
  return cache.getSubject(a).filter(e => e.hasOwnProperty('loading'))
}

function combineLatest(fs) {
  // fix https://github.com/ReactiveX/rxjs/issues/1686
  return Observable.combineLatest(...fs, (...values) => values)
}

export function observe<A, P>(fetch: FetchT<A, P> | CachedFetchT<A, P>, a: A): Observable {
  if (fetch.type === 'product') {
    return combineLatest(fetch.fetches.map((fetch, i) => observe(fetch, a[i])))
  }
  if (fetch.type === 'star') {
    return combineLatest(a.map((ai) => observe(fetch.fetch, ai)))
  }
  if (fetch.type === 'composition') {
    const { master, slave, ptoa } = fetch
    const isProduct = ( master.type === 'product' )
    return observe(master, a).switchMap(x => {
      const ok = isProduct ? x.every(xi => xi.hasOwnProperty('data')) : x.hasOwnProperty('data')
      if (ok) {
        const data = isProduct ? x.map(xi => xi.data) : x.data
        const a1  = ptoa(data, a)
        if (x.loading) {
          return Observable.of({
            loading: true,
            data: slave.cache.getSubject(a1).value.data
          })
        }
        return observeCache(slave.cache, a1)
      }
      return Observable.of({ loading: true })
    })
  }
  return observeCache(fetch.cache, a)
}
