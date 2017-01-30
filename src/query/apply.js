import 'rxjs/add/operator/map'

import mapValues from 'lodash/mapValues'
import some from 'lodash/some'

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
  const data = mapValues(queries, (fetch, queryName) => ({
    loading: false,
    ...querySync(fetch, args[queryName])
  }));
  const loading = some(data, { loading: true });
  return { loading, data }
}
