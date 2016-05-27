import t from 'tcomb'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/map'

import {
  observe
} from './observe'

export function query(fetch, a) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(t.Function.is(fetch), () => `Invalid argument fetch supplied to query (expected a function)`)
  }

  const observer = observe(fetch, a)

  fetch(a)

  return observer
}
