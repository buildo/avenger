import { invalidate } from './invalidate'
import { queriesAndArgs } from './util';
import { NOT_DONE, extractDone } from '../query/invalidate';
import t from 'tcomb';

function extractCache(fetch, a) {
  if (fetch.type === 'product') {
    return null
  }
  else if (fetch.type === 'composition') {
    const masterDone = extractDone(fetch.master, a)
    return masterDone !== NOT_DONE ? extractCache(fetch.slave, fetch.ptoa(masterDone)) : null
  }
  return fetch.cache || null
}

export function runCommand(graph, command, A) {
  const invalidates = command.invalidates;
  const allPs = Object.keys(invalidates);
  const { args } = queriesAndArgs(graph, allPs, A);
  console.log('>>', invalidates);
  const invalidatePs = allPs
    .filter(P => !t.Function.is(invalidates[P]));
  const optimisticPs = allPs
    .filter(P => t.Function.is(invalidates[P]));
  const optimisticChanges = optimisticPs
    .map(P => ({ P, done: extractDone(graph[P].fetch, args[P]) }))
    .filter(({ done }) => done !== NOT_DONE);

  const ret = command.run(A).then(v => {
    invalidate(graph, invalidatePs, A);
    optimisticPs.forEach(P => {
      graph[P].fetch(args[P]);
    })
    return v;
  }).catch(err => {
    // TODO: undo optimistic changes
    throw err;
  });
  // emit optimistic payloads
  optimisticChanges.forEach(({ P, done }) => {
    const cache = extractCache(graph[P].fetch, args[P]);
    if (cache) {
      const optimisticPayload = invalidates[P](done, args[P]);
      const optimisticPromise = Promise.resolve(optimisticPayload);
      console.log('>>', cache.atok(args[P]), cache.subjects);
      cache.storePromise(args[P], optimisticPromise);
      cache.storePayload(args[P], optimisticPayload, optimisticPromise);
    }
  });
  return ret;
}
