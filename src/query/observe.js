import t from 'tcomb'
import debug from 'debug';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/do';

const log = debug('avenger:query:observe')

function observeCache(cache, a) {
  return cache.getSubject(a).do(e => console.log(e)).filter(e => e.hasOwnProperty('loading'))
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
      // log(`observe switchMap ok:${ok} x:${JSON.stringify(x, null, 2)}`)
      if (ok) {
        const data = isProduct ? x.map(xi => xi.data) : x.data
        const a1  = ptoa(data, a)
        const loading = isProduct ? x.some(xi => xi.loading) : x.loading
        if (loading) {
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
