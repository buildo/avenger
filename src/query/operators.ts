import {
  cacheFetch as cf,
  cacheCatalog as cc,
  cacheStar as cs
} from '../cache/operators'

import { ObservableCache } from './ObservableCache'
import { Strategy } from '../cache/strategies'
import { Cache } from '../cache/Cache'
import { Fetch, TypedFetch } from '../fetch/operators'

export interface Cached<A, P> extends TypedFetch<A, P> {
  readonly type: 'cached'
  readonly cache: ObservableCache<A, P>
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

  const cachedStar = cs(star, strategy, cache, pcache)
  Object.assign(cachedStar, {
    type: 'cached',
    cache
  })
  return cachedStar as any
}
