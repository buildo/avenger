import t from 'tcomb'
import 'rxjs/add/operator/distinctUntilChanged'

// avoid as much as possible deep comparisons
// by just diffing on (nested) `loading` keys
function isEqual(a, b) {
  if (a.loading !== b.loading) {
    return false
  }

  for (const k in b) { // eslint-disable-line no-loops/no-loops
    if (k !== 'loading' && typeof b[k] === 'object' && b[k].hasOwnProperty('loading')) {
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
