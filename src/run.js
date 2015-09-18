import t from 'tcomb';
import { QueryNodes, State/*, MinimizedCache*/ } from './types';
import { allValues, collect, error } from './util';
import positiveDiff from './positiveDiff';
import createFetcher from './createFetcher';
import minDepsParams from './minDepsParams';

export function runLocal({
  input, oldInput,
  state, cache,
  emit
}) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(QueryNodes.is(input), `Invalid input provided to runLocal`);
    t.assert(State.is(state), `Invalid state provided to runLocal`);
  }

  const diff = positiveDiff(input, oldInput);
  const toRun = Object.keys(input)
    .filter(k => diff[k])
    .reduce(...collect(input));
  const runState = {};

  const _run = node => {
    const { query: { id, dependencies, fetch, cache: cacheMode, cacheParams }, parents, ...more } = node;

    if (runState[id]) {
      return runState[id];
    }

    const depsPrsObj = Object.keys(parents).reduce(...collect(parents, _run));
    const depsPrs = allValues(depsPrsObj);

    runState[id] = new Promise((resolve, reject) => {
      depsPrs.then(
        depsResults => {
          return createFetcher({
            id, fetch, state, cache, cacheMode, cacheParams, emit,
            depsParams: minDepsParams(dependencies || {}, depsResults)
          }).then(res => {
            resolve(res);
            return res;
          }, error(emit, id, reject));
        },
        error(emit, id, reject)
      ).catch(error(emit, id, reject));
    });

    return runState[id];
  };

  return allValues(Object.keys(toRun).reduce(...collect(toRun, _run)));
}

// export function runFromRecipe({
//   input, state, minCache,
//   // emit // useful for testing anyway
// }) {
//   if (process.env.NODE_ENV !== 'production') {
//     t.assert(QueryNodes.is(input), `Invalid input provided to runLocal`);
//     t.assert(State.is(state), `Invalid state provided to runLocal`);
//     t.assert(MinimizedCache.is(minCache), `Invalid minCache provided to runLocal`);
//   }

// }
