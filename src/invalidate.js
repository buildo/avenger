import t from 'tcomb';
import { AvengerInput, QueryNodes, State, PromiseType } from './types';
import { runLocal } from './run';
import { collect } from './util';

const InvalidateLocalParams = t.struct({
  invalidate: AvengerInput,
  input: QueryNodes,
  state: State,
  result: t.Object,
  cache: t.Any,
  emit: t.Function
}, 'InvalidateLocalParams');

export function invalidateLocal(params: InvalidateLocalParams): PromiseType {
  const {
    // queries to be invalidated
    invalidate,
    // current QS queries
    input,
    // current result
    result,
    state, cache, emit
  } = params;

  const oldInput = { ...input };

  const _invalidate = ({ query: { id, cacheParams, dependencies }, children }) => {
    const depsParams = Object.keys(dependencies || {})
      .map(k => {
        const map = dependencies[k].map || (x => x);
        return {
          k, val: map(result[dependencies[k].query.id])
        };
      })
      .reduce((ac, { k, val }) => ({
        ...ac,
        [k]: val
      }), {});
    const allParams = { ...state, ...depsParams };
    const allKeys = Object.keys(allParams);
    const filteredKeys = allKeys.filter(k => (cacheParams ? Object.keys(cacheParams) : allKeys).indexOf(k) !== -1);
    const filteredCacheParams = filteredKeys.reduce(...collect(allParams));

    // invalidate cache for this query
    cache.invalidate(id, filteredCacheParams);
    // keep track of non-stale (invaldiated) queries
    // in oldInput in order to trick `run`
    delete oldInput[id];

    Object.keys(children)
      .map(k => children[k])
      .forEach(_invalidate);
  };

  Object.keys(invalidate).map(k => input[k]).forEach(_invalidate);

  return runLocal({
    state, oldState: state,
    input, oldInput,
    cache,
    emit
  }).then(
    fresh => ({ ...result, ...fresh }),
    err => {
      throw err;
    }
  );
}

// export function invalidateRemote() {}