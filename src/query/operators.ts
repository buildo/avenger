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

export interface CachedFetch<A, P> extends TypedFetch<A, P> {
  readonly type: 'cached'
  readonly cache: ObservableCache<A, P, A>
}

function removeEntriesByPredicate<A, P, S>(cache: ObservableCache<A, P, S>, predicate: (k: string, v: CacheValue<P>) => boolean) {
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
    cache: ObservableCache<A, P, A>
  ): CachedFetch<A, P> {

  const cachedFetch: any = cf(fetch, strategy, cache)
  cachedFetch.type = 'cached'
  cachedFetch.cache = cache
  return cachedFetch
}

export function cacheCatalog<A, P>(
    catalog: Fetch<Array<A>, Array<P>>,
    strategy: Strategy,
    pcache: Cache<A, P>,
    ptoa: (p: P, as?: Array<A>, i?: number) => A
  ): CachedFetch<Array<A>, Array<P>> {

  const cache = new ObservableCache<Array<A>, Array<P>, A>({ name: catalog.name })
  const atok = pcache.atok

  cache.deleteBySingleton = a => removeEntriesByPredicate(cache, (s, p) => {
    if (p.done) {
      return p.done.value.some(p => atok(ptoa(p, JSON.parse(s))) === atok(a))
    }
    return false
  })

  const cachedCatalog: any = cc(catalog, strategy, cache, pcache, ptoa)
  cachedCatalog.type = 'cached'
  cachedCatalog.cache = cache
  return cachedCatalog
}

export function cacheStar<A, P>(star: Fetch<Array<A>, Array<P>>, strategy: Strategy, pcache: Cache<A, P>) {
  const atok = (as: Array<A>) => JSON.stringify(as.map(pcache.atok))
  const cache = new ObservableCache<Array<A>, Array<P>, A>({ atok, name: star.name })

  cache.deleteBySingleton = a => removeEntriesByPredicate(cache, (as) => (JSON.parse(as) as Array<string>).indexOf(pcache.atok(a)) !== -1)

  const cachedStar: any = cs(star, strategy, cache, pcache)
  cachedStar.type = 'cached'
  cachedStar.cache = cache
  return cachedStar
}
