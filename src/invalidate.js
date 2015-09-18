import t from 'tcomb';
import { QueryNodes, State } from './types';
import { runLocal } from './run';
import { collect } from './util';

export function invalidateLocal({
  // queries to be invalidated
  invalidate,
  // current QS queries
  input,
  // current result
  result,
  state, cache,
  // more params for runLocal?
  ...more
}) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(QueryNodes.is(invalidate), `Invalid invalidate provided to invaldiateLocal`);
    t.assert(QueryNodes.is(input), `Invalid input provided to invalidateLocal`);
    t.assert(State.is(state), `Invalid state provided to invalidateLocal`);
  }

  const oldInput = Object.keys(input).filter(k => !invalidate[k]).reduce(...collect(input));

  const _invalidate = ({ query: { id, cacheParams, dependencies }, children }) => {
    const depsParams = Object.keys(dependencies || {}).map(k => ({
      k, val: dependencies[k].map(result[dependencies[k].query.id])
    })).reduce((ac, { k, val }) => ({
      ...ac,
      [k]: val
    }), {});
    const allParams = { ...state, ...depsParams };
    const allKeys = Object.keys(allParams);
    const filteredKeys = allKeys.filter(k => (cacheParams || allKeys).indexOf(k) !== -1);
    const filteredCacheParams = filteredKeys.reduce(...collect(allParams));

    cache.invalidate(id, filteredCacheParams);

    Object.keys(children).map(k => children[k]).forEach(_invalidate);
  };

  Object.keys(invalidate).map(k => invalidate[k]).forEach(_invalidate);

  return runLocal({
    ...more,
    state, cache,
    input,
    oldInput
  }).then(fresh => ({ ...result, ...fresh }));
}

// export function invalidateRemote() {}
