import t from 'tcomb'

import {
  Strategy
} from './strategies'

import {
  Cache
} from './Cache'

export function cacheFetch(fetch, strategy, cache) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(t.Function.is(fetch), () => 'Invalid argument fetch supplied to cache (expected a function)')
    t.assert(Strategy.is(strategy), () => 'Invalid argument strategy supplied to cache (expected a Strategy)')
    t.assert(cache instanceof Cache, () => 'Invalid argument cache supplied to cache (expected a Cache)')
  }

  return function cachedFetch(a) {
    return cache.getPromise(a, strategy, fetch)
  }
}

export function cacheCatalog(catalog, strategy, cache, pcache, ptoa) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(t.Function.is(catalog), () => 'Invalid argument catalog supplied to cacheCatalog (expected a function)')
    t.assert(cache instanceof Cache, () => 'Invalid argument cache supplied to cacheCatalog (expected a Cache)')
    t.assert(Strategy.is(strategy), () => 'Invalid argument strategy supplied to cacheCatalog (expected a Strategy)')
    t.assert(pcache instanceof Cache, () => 'Invalid argument pcache supplied to cacheCatalog (expected a Cache)')
  }

  return function cachedCatalog(s) {
    const { blocked, done } = cache.get(s)
    const promise = cache.getPromise(s, strategy, catalog)
    const shouldStorePaylods = !(promise === blocked || ( done && promise === done.promise ))
    if (shouldStorePaylods) {
      promise.then(ps => {
        ps.forEach((p, i) => {
          const a = ptoa(p, s, i)
          pcache.storePayload(a, p, Promise.resolve(p))
        })
        return ps
      })
    }
    return promise
  }
}

export function cacheStar(star, strategy, cache, pcache) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(t.Function.is(star), () => 'Invalid argument star supplied to cacheStar (expected a function)')
    t.assert(Strategy.is(strategy), () => 'Invalid argument strategy supplied to cacheStar (expected a Strategy)')
    t.assert(cache instanceof Cache, () => 'Invalid argument cache supplied to cacheStar (expected a Cache)')
    t.assert(pcache instanceof Cache, () => 'Invalid argument pcache supplied to cacheStar (expected a Cache)')
  }

  let resolvedPromise
  let queue = []

  function enqueuePostPromiseJob(fn) {
    if (!resolvedPromise) {
      resolvedPromise = Promise.resolve();
    }
    resolvedPromise.then(() => process.nextTick(fn))
  }

  function dispatchQueue() {
    const q = queue
    queue = []

    const as = q.map(({ a }) => a);
    cache.log('star calls optimised to %o', as)
    const batchPromise = star(as);
    batchPromise.then(values => {
      q.forEach(({ key, resolve }, i) => {
        resolve(values[i]);
      });
    })
  }

  function load(a) {
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

  return function cachedStar(as) {
    if (process.env.NODE_ENV !== 'production') {
      t.assert(t.Array.is(as), () => `Invalid argument as ${t.stringify(as)} supplied to cachedStar (expected an array)`)
    }

    const promise = Promise.all(as.map(load))
    cache.storePromise(as, promise)
    return promise
  }
}
