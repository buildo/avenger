function del(cache, a) {
  if (cache.deleteBySingleton) {
    cache.deleteBySingleton(a)
  }
  cache.delete(a)
}

const NOT_DONE = {};

// TODO?
function extractDone(fetch, a) {
  if (fetch.type === 'product') {
    const productDone = fetch.fetches.map((f, i) => extractDone(f, a[i]))
    const allDone = productDone.every(d => d !== NOT_DONE)
    return allDone ? productDone : NOT_DONE
  }
  else if (fetch.type === 'composition') {
    const masterDone = extractDone(fetch.master, a)
    return masterDone !== NOT_DONE ? extractDone(fetch.slave, fetch.ptoa(masterDone)) : NOT_DONE
  }
  const cache = fetch.cache
  const value = cache && cache.get(a)
  return value && value.done && value.done.hasOwnProperty('done') ? value.done.value : NOT_DONE
}

export function invalidate(fetch, a) {
  if (fetch.type === 'product') {
    fetch.fetches.forEach((f, i) => invalidate(f, a[i]))
  }
  else if (fetch.type === 'composition') {
    const masterDone = extractDone(fetch.master, a)
    if (masterDone !== NOT_DONE) {
      invalidate(fetch.master, a)
      invalidate(fetch.slave, fetch.ptoa(masterDone))
    }
  } else {
    del(fetch.cache, a)
  }
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
    // see e3911a8 for a tentative implementation that doesn't work
    // (it's overfetching)
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
  return fetch.cache ? fetch.cache.getSubject(a).observers.length > 0 : false
}