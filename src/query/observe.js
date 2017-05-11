import t from 'tcomb'
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/of';
import { hasObservers } from './invalidate';

function mapRespectingStrategy(strategy) {
  return subjectValue => {
    if (subjectValue.hasOwnProperty('data') && strategy.isAvailable(subjectValue.data)) {
      return subjectValue
    }

    return { loading: subjectValue.loading }
  }
}

function mapToPlainValue(subjectValue) {
  return subjectValue.hasOwnProperty('data') ?
    Object.assign({}, subjectValue, { data: subjectValue.data.done.value }) : subjectValue
}

export function extractSyncValue(cache, a) {
  return mapToPlainValue(cache.getSubject(a).value)
}

function observeCache(cache, a, strategy) {
  return cache.getSubject(a)
    .filter(e => e.hasOwnProperty('loading'))
    .map(mapRespectingStrategy(strategy))
    .map(mapToPlainValue)
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
        const a1 = ptoa(data, a)
        const loading = isProduct ? x.some(xi => xi.loading) : x.loading
        if (loading) {
          return Observable.of({
            loading: true,
            data: extractSyncValue(slave.cache, a1).data
          })
        }

        // if "slave" is being observed re-fetch it as its A may have changed due to the fetching of its "master"
        Promise.resolve().then(() => {
          if (hasObservers(slave, a1)) {
            slave(a1);
          }
        })

        return observeCache(slave.cache, a1, slave.strategy)
      }
      return Observable.of({ loading: true })
    })
  }
  return observeCache(fetch.cache, a, fetch.strategy)
}
