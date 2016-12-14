import t from 'tcomb'

import {
  observe, observeSync
} from './observe'

export function query(fetch, a) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(t.Function.is(fetch), () => 'Invalid argument fetch supplied to query (expected a function)')
  }

  const observer = observe(fetch, a)

  fetch(a)

  return observer
}

export function querySync(fetch, a) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(t.Function.is(fetch), () => 'Invalid argument fetch supplied to query (expected a function)')
  }

  const value = observeSync(fetch, a)

  return value
}
