import t from 'tcomb'
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/of';

function observeCache(cache, a) {
  return cache.getSubject(a).filter(e => e.hasOwnProperty('loading'))
}

export function observe(fetch, a) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(t.Function.is(fetch), () => 'Invalid argument fetch supplied to observe (expected a function)')
  }

  if (fetch.type === 'product') {
    // fix https://github.com/ReactiveX/rxjs/issues/1686
    return Observable.combineLatest(...fetch.fetches.map((fetch, i) => observe(fetch, a[i])), (...values) => values)
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
