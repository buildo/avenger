import { invalidate } from './invalidate'
import { queriesAndArgs } from './util';
import { NOT_DONE, extractDone } from '../query/invalidate';
import { refetch } from '../cache/strategies';
import pick from 'lodash/pick';
import find from 'lodash/find';

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
  const optimisticChanges = allPs
    .map(P => ({
      P,
      done: extractDone(graph[P].fetch, args[P]),
      cache: extractCache(graph[P].fetch, args[P])
    }))
    .filter(({ done, cache }) => done !== NOT_DONE && cache);
  console.log('>> optimistic', { optimisticChanges, invalidates });
  const invalidatePs = allPs.filter(P => !find(optimisticChanges, { P }));

  const ret = command.run(A).then(v => {
    invalidate(graph, invalidatePs, A);
    optimisticChanges.forEach(({ P }) => {
      console.log('>> optimisticRefetch', args[P]);
      graph[P].fetch(args[P], refetch);
    })
    return v;
  }).catch(err => {
    optimisticChanges.forEach(({ P, done, cache }) => {
      console.log('>> optimisticRollback', args[P], done);
      const rollbackPromise = Promise.resolve(done);
      cache.storePromise(args[P], rollbackPromise);
      cache.storePayload(args[P], done, rollbackPromise);
    });
    throw err;
  });
  // emit optimistic payloads
  optimisticChanges.forEach(({ P, done, cache }) => {
    const optimisticPayload = invalidates[P](done, pick(A, Object.keys(command.params)));
    const optimisticPromise = Promise.resolve(optimisticPayload);
    console.log('>> optimisticPayload', args[P], optimisticPayload);
    cache.storePromise(args[P], optimisticPromise);
    cache.storePayload(args[P], optimisticPayload, optimisticPromise);
  });
  return ret;
}
