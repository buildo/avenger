import {
  product
} from '../fetch/operators'

import {
  query
} from './query'


function otoa(args, fetch) {
  if (fetch.type === 'product') {
    return fetch.fetches.map((f, i) => otoa(args[fetch.itok[i]], f))
  }
  return args
}

function etoo(e, fetch) {
  if (fetch.type === 'product') {
    const data = {}
    let loading = false
    fetch.fetches.forEach((f, i) => {
      data[fetch.itok[i]] = etoo(e[i], f)
      loading = loading || e[i].loading
    })
    return { loading, data }
  }
  return e
}

function createProduct(queries, itok) {
  const fetches = itok.map(k => queries[k])
  const fetch = product(fetches)
  fetch.itok = itok
  return fetch
}

export function apply(queries, args) {
  const itok = Object.keys(args)
  const fetch = createProduct(queries, itok)
  return query(fetch, otoa(args, fetch))
    .map(e => etoo(e, fetch))
}

