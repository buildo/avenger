import 'rxjs/add/operator/map'

import {
  product
} from '../fetch/operators'

import {
  query, querySync
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

export function apply(queries, args) {
  const itok = Object.keys(args)
  const fetches = itok.map(k => queries[k])
  const as = itok.map(k => args[k])
  const prod = product(fetches)
  return query(prod, as).map(e => etoo(e, prod, itok))
}

export function applySync(queries, args) {
  const itok = Object.keys(args)
  const fetches = itok.map(k => queries[k])
  const as = itok.map(k => args[k])
  const prod = product(fetches)
  return etoo(querySync(prod, as), prod, itok)
}
