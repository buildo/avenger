import t from 'tcomb'
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/filter';

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
    return observe(master, a).switchMap(x => {
      if (x.hasOwnProperty('data')) {
        const a1  = ptoa(x.data, a)
        if (x.loading) {
          return {
            loading: true,
            data: slave.cache.getSubject(a1).value
          }
        }
        return observeCache(slave.cache, a1)
      }
      return Observable.of({ loading: true })
    })
  }
  return observeCache(fetch.cache, a)
}
