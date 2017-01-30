import 'rxjs/add/operator/map'

import mapValues from 'lodash/mapValues'

import {
  product
} from '../fetch/operators'

import {
  query,
  querySync
} from './query'


function etoo(e, fetch, itok) {
  const data = {}
  let loading = false
  fetch.fetches.forEach((f, i) => {
    data[itok[i]] = e[i]
    loading = loading || e[i] && e[i].loading
  })
  return { loading, data }
}

function _apply(queries, args, _query) {
  const itok = Object.keys(args)
  const fetches = itok.map(k => queries[k])
  const as = itok.map(k => args[k])
  const prod = product(fetches)
  return _query(prod, as).map(e => etoo(e, prod, itok))
}

export function apply(queries, args) {
  return _apply(queries, args, query)
}

export function applySync(queries, args) {
  return mapValues(queries, (fetch, queryName) => querySync(fetch, args[queryName]));
}
