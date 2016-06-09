// @flow

import type {
  StrategyT
} from '../cache/strategies'

import type {
  FetchT
} from '../fetch/operators'

import {
  cacheFetch as cf,
  cacheCatalog as cc,
  cacheStar as cs
} from '../cache/operators'

import {
  ObservableCache
} from './ObservableCache'

export interface CachedFetchT<A, P> {
  (a: A): Promise<P>;
  cache: ObservableCache<A, P>;
  deleteBySingleton: (a: A) => void;
}

function removeEntriesByPredicate(cache, predicate) {
  const map = cache.map
  map.forEach((v, k) => {
    if (predicate(k, v)) {
      map.delete(k)
    }
  })
}

export function cacheFetch<A, P>(fetch: FetchT<A, P>, strategy: StrategyT, cache: ObservableCache<A, P>): CachedFetchT<A, P> {
  const cachedFetch = cf(fetch, strategy, cache)

  cachedFetch.cache = cache

  cachedFetch.deleteBySingleton = (a) => cache.delete(a)

  return cachedFetch
}

export function cacheCatalog<S, P, A>(catalog: FetchT<S, Array<P>>, strategy: StrategyT, pcache: ObservableCache<A, P>, ptoa: (p: P, s: S) => A): CachedFetchT<S, Array<P>> {
  const cache = new ObservableCache({ name: catalog.name })
  const cachedCatalog = cc(catalog, strategy, cache, pcache, ptoa)
  const atok = pcache.atok

  cachedCatalog.cache = cache

  cachedCatalog.deleteBySingleton = (a) => removeEntriesByPredicate(cache, (s, p) => {
    if (p.done) {
      return p.done.value.some(p => atok(ptoa(p, JSON.parse(s))) === atok(a))
    }
    return false
  })

  return cachedCatalog
}

export function cacheStar<A, P>(star: FetchT<Array<A>, Array<P>>, strategy: StrategyT, pcache: ObservableCache<A, P>): CachedFetchT<Array<A>, Array<P>> {
  const atok = (as) => JSON.stringify(as.map(pcache.atok))
  const cache = new ObservableCache({ atok, name: star.name })
  const cachedStar = cs(star, strategy, cache, pcache)

  cachedStar.cache = cache

  cachedStar.deleteBySingleton = (a) => removeEntriesByPredicate(cache, (as) => JSON.parse(as).indexOf(pcache.atok(a) !== -1))

  return cachedStar
}