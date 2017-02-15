import t from 'tcomb'
import 'rxjs/add/operator/distinctUntilChanged'

// avoid as much as possible deep comparisons
// by just diffing on (nested) `loading` keys
function isEqual(a, b) {
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

import {
  observe
} from './observe'

export function query(fetch, a) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(t.Function.is(fetch), () => 'Invalid argument fetch supplied to query (expected a function)')
  }

  const observer = observe(fetch, a).distinctUntilChanged(isEqual)

  fetch(a)

  return observer
}

export function querySync(fetch, a) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(t.Function.is(fetch), () => 'Invalid argument fetch supplied to querySync (expected a function)')
  }

  if (fetch.type === 'product') {
    return fetch.fetches.map((fetch, i) => querySync(fetch, a[i]))
  }

  if (fetch.type === 'composition') {
    const { master, slave, ptoa } = fetch
    const isProduct = ( master.type === 'product' )
    const x = querySync(master, a);
    const ok = isProduct ? x.every(xi => xi.hasOwnProperty('data')) : x.hasOwnProperty('data')
    if (ok) {
      const data = isProduct ? x.map(xi => xi.data) : x.data
      const a1 = ptoa(data, a)
      const loading = isProduct ? x.some(xi => xi.loading) : x.loading
      if (loading) {
        return {
          loading: true,
          data: slave.cache.getSubject(a1).value.data
        }
      }
      return slave.cache.getSubject(a1).value
    }
    return { loading: true }
  }

  return fetch.cache.getSubject(a).value
}
