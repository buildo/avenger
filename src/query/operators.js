import t from 'tcomb'

import {
  cacheFetch as cf,
  cacheCatalog as cc,
  cacheStar as cs
} from '../cache/operators'

import {
  ObservableCache
} from './ObservableCache'

function removeEntriesByPredicate(cache, predicate) {
  const map = cache.map
  map.forEach((v, k) => {
    if (predicate(k, v)) {
      map.delete(k)
    }
  })
}

export function cacheFetch(fetch, strategy, cache) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(cache instanceof ObservableCache, () => 'Invalid argument cache supplied to cache (expected a ObservableCache)')
  }

  const cachedFetch = cf(fetch, strategy, cache)
  cachedFetch.cache = cache
  return cachedFetch
}

export function cacheCatalog(catalog, strategy, pcache, ptoa) {
  const cache = new ObservableCache({ name: catalog.name })
  const cachedCatalog = cc(catalog, strategy, cache, pcache, ptoa)
  const atok = pcache.atok

  cache.deleteBySingleton = (a) => removeEntriesByPredicate(cache, (s, p) => {
    if (p.done) {
      return p.done.value.some(p => atok(ptoa(p, JSON.parse(s))) === atok(a))
    }
    return false
  })

  cachedCatalog.cache = cache

  return cachedCatalog
}

export function cacheStar(star, strategy, pcache) {
  const atok = (as) => JSON.stringify(as.map(pcache.atok))
  const cache = new ObservableCache({ atok, name: star.name })
  const cachedStar = cs(star, strategy, cache, pcache)

  cache.deleteBySingleton = (a) => removeEntriesByPredicate(cache, (as) => JSON.parse(as).indexOf(pcache.atok(a) !== -1))

  cachedStar.cache = cache

  return cachedStar
}