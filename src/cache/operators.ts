import { Fetch, TypedFetch } from '../fetch/operators'
import { Strategy } from './strategies'
import { Cache } from './Cache'

export function cacheFetch<A, P>(fetch: Fetch<A, P>, strategy: Strategy, cache: Cache<A, P>): TypedFetch<A, P> {
  const cachedFetch = (a: A) => cache.getPromise(a, strategy, fetch)
  return cachedFetch as any
}

/*
export function cacheCatalog<A, P>(
    catalog: Fetch<Array<A>, Array<P>>,
    strategy: Strategy,
    cache: Cache<Array<A>, Array<P>>,
    pcache: Cache<A, P>,
    ptoa: (p: P, as?: Array<A>, i?: number) => A
  ): TypedFetch<Array<A>, Array<P>> {

  const cachedCatalog = (as: Array<A>) => {
    const { blocked, done } = cache.get(as)
    const promise = cache.getPromise(as, strategy, catalog)
    const shouldStorePaylods = !(promise === blocked || ( done && promise === done.promise ))
    if (shouldStorePaylods) {
      promise.then(ps => {
        ps.forEach((p, i) => {
          const a = ptoa(p, as, i)
          pcache.storePayload(a, p, Promise.resolve(p))
        })
        return ps
      })
    }
    return promise
  }
  return cachedCatalog as any
}

export function cacheStar<A, P>(
    star: Fetch<Array<A>, Array<P>>,
    strategy: Strategy,
    cache: Cache<Array<A>, Array<P>>,
    pcache: Cache<A, P>
  ): TypedFetch<Array<A>, Array<P>> {

  let resolvedPromise: Promise<never>
  let queue: Array<{ a: A, resolve: Function }> = []

  function enqueuePostPromiseJob(fn: () => void) {
    if (!resolvedPromise) {
      resolvedPromise = Promise.resolve();
    }
    resolvedPromise.then(() => process.nextTick(fn))
  }

  function dispatchQueue(): void {
    const q = queue
    queue = []

    const as = q.map(({ a }) => a);
    cache.log('star calls optimised to %o', as)
    const batchPromise = star(as);
    batchPromise.then(values => {
      q.forEach(({ resolve }, i) => {
        resolve(values[i]);
      });
    })
  }

  function load(a: A) {
    const availablePromise = pcache.getAvailablePromise(a, strategy)
    if (availablePromise) {
      cache.log('star call optimised for %o', a)
      return availablePromise
    }

    const promise = new Promise(resolve => {
      queue.push({ a, resolve });
      if (queue.length === 1) {
        enqueuePostPromiseJob(() => dispatchQueue());
      }
    })

    pcache.storePromise(a, promise)

    return promise
  }

  const cachedStar = (as: Array<A>) => {
    const promise = Promise.all(as.map(load))
    cache.storePromise(as, promise)
    return promise
  }

  return cachedStar as any
}
*/
