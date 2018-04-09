import * as t from 'io-ts';
import { ThrowReporter } from 'io-ts/lib/ThrowReporter';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/of';
import { hasObservers } from './invalidate';

function observeCache(cache, a) {
  return cache.getSubject(a).filter(e => e.hasOwnProperty('loading'))
}

export function observe(fetch, a) {
  if (process.env.NODE_ENV !== 'production') {
    ThrowReporter.report(t.Function.decode(fetch))
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

        return observeCache(slave.cache, a1)
      }
      return Observable.of({ loading: true })
    })
  }
  return observeCache(fetch.cache, a)
}
