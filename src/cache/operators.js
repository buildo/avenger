export function cacheFetch(fetch, strategy, cache) {
  return function cachedFetch(a) {
    return cache.getPromise(a, strategy, fetch)
  }
}

export function cacheCatalog(catalog, strategy, cache, pcache, ptoa) {
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
    const promise = Promise.all(as.map(load))
    cache.storePromise(as, promise)
    return promise
  }
}
