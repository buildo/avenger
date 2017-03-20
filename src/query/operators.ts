import {
  cacheFetch as cf,
  cacheCatalog as cc,
  cacheStar as cs
} from '../cache/operators'

import { ObservableCache } from './ObservableCache'
import { Strategy } from '../cache/strategies'
import { Cache } from '../cache/Cache'
import { CacheValue } from '../cache/strategies'
import { Fetch, TypedFetch } from '../fetch/operators'

export interface Cached<A, P> extends TypedFetch<A, P> {
  readonly type: 'cached'
  readonly cache: ObservableCache<A, P>
}

function removeEntriesByPredicate<A, P>(cache: ObservableCache<A, P>, predicate: (k: string, v: CacheValue<P>) => boolean) {
  const map = cache.map
  map.forEach((v, k) => {
    if (predicate(k, v)) {
      map.delete(k)
    }
  })
}

export function cacheFetch<A, P>(
    fetch: Fetch<A, P>,
    strategy: Strategy,
    cache: ObservableCache<A, P>
  ): Cached<A, P> {

  const cachedFetch = cf(fetch, strategy, cache)
  Object.assign(cachedFetch, {
    type: 'cached',
    cache
  })
  return cachedFetch as any
}

export function cacheCatalog<A, P>(
    catalog: Fetch<Array<A>, Array<P>>,
    strategy: Strategy,
    pcache: Cache<A, P>,
    ptoa: (p: P, as?: Array<A>, i?: number) => A
  ): Cached<Array<A>, Array<P>> {

  const cache = new ObservableCache<Array<A>, Array<P>>({ name: catalog.name })
  const atok = (as: Array<A>) => JSON.stringify(as.map(pcache.atok))

  cache.deleteBySingleton = (a: Array<A>) => removeEntriesByPredicate(cache, (s, p) => {
    if (p.done) {
      return p.done.value.some(p => atok((JSON.parse(s) as Array<P>).map(p => ptoa(p))) === atok(a))
    }
    return false
  })

  const cachedCatalog = cc(catalog, strategy, cache, pcache, ptoa)
  Object.assign(cachedCatalog, {
    type: 'cached',
    cache
  })
  return cachedCatalog as any
}

export function cacheStar<A, P>(
    star: Fetch<Array<A>, Array<P>>,
    strategy: Strategy,
    pcache: Cache<A, P>
  ): Cached<Array<A>, Array<P>> {

  const atok = (as: Array<A>) => JSON.stringify(as.map(pcache.atok))
  const cache = new ObservableCache<Array<A>, Array<P>>({ atok, name: star.name })

  cache.deleteBySingleton = a => removeEntriesByPredicate(cache, (as) => (JSON.parse(as) as Array<string>).indexOf(atok(a)) !== -1)

  const cachedStar = cs(star, strategy, cache, pcache)
  Object.assign(cachedStar, {
    type: 'cached',
    cache
  })
  return cachedStar as any
}
