function del(cache, a) {
  if (cache.deleteBySingleton) {
    cache.deleteBySingleton(a)
  }
  cache.delete(a)
}

export function invalidate(fetch, a) {
  if (fetch.type === 'product') {
    return fetch.fetches.some((f, i) => invalidate(f, a[i]))
  }
  else if (fetch.type === 'composition') {
    return invalidate(fetch.master, a)
  }
  del(fetch.cache, a)
}

export function hasObservers(fetch, a) {
  if (fetch.type === 'product') {
    return fetch.fetches.some((f, i) => hasObservers(f, a[i]))
  }
  else if (fetch.type === 'composition') {
    // what I'd like to do:
    //
    //   return hasObservers(fetch.slave, fetch.ptoa(fetch.master(a)))
    //
    // but `fetch.master(a)` is async
    // how to do this without an ad-hoc cache for the composition?
    //
    // the following hacky solution just limits overfetching
    // but it is not ok in theory: there might be multiple active instances
    // of the same "fetch class" (i.e. where only instace `a` differs)
    // and we might return `true` here for cases where this specific `a`
    // has no observers and thus shouldn't need a refetch
    //
    const subjects = fetch.slave.cache.subjects
    return Object.keys(subjects).some(k => subjects[k].observers.length > 0)
  }
  return fetch.cache && fetch.cache.getSubject(a).observers.length > 0
}