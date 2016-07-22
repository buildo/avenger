function del(cache, a) {
  if (cache.deleteBySingleton) {
    cache.deleteBySingleton(a)
  }
  cache.delete(a)
}

function hasObservers(cache, a) {
  return cache.getSubject(a).observers.length > 0
}

// returns true if something is observing the fetch
export function invalidate(fetch, a) {
  if (fetch.type === 'product') {
    return fetch.fetches.some((f, i) => invalidate(f, a[i]))
  }
  else if (fetch.type === 'composition') {
    return invalidate(fetch.master, a)
  }
  del(fetch.cache, a)
  return hasObservers(fetch.cache, a)
}