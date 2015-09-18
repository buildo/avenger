import t from 'tcomb';
import { AvengerInput, QueryNodes, State } from './types';
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
    t.assert(AvengerInput.is(invalidate), `Invalid invalidate provided to invaldiateLocal`);
    t.assert(QueryNodes.is(input), `Invalid input provided to invalidateLocal`);
    t.assert(State.is(state), `Invalid state provided to invalidateLocal`);
  }

  const oldInput = { ...input };

  const _invalidate = ({ query: { id, cacheParams, dependencies }, children }) => {
    const depsParams = Object.keys(dependencies || {})
      .map(k => ({
        k, val: dependencies[k].map(result[dependencies[k].query.id])
      }))
      .reduce((ac, { k, val }) => ({
        ...ac,
        [k]: val
      }), {});
    const allParams = { ...state, ...depsParams };
    const allKeys = Object.keys(allParams);
    const filteredKeys = allKeys.filter(k => (cacheParams ? Object.keys(cacheParams) : allKeys).indexOf(k) !== -1);
    const filteredCacheParams = filteredKeys.reduce(
      ...collect(
        allParams,
        (v, k) => cacheParams && t.Func.is(cacheParams[k]) ? cacheParams[k](v) : v
      )
    );

    // invalidate cache for this query
    cache.invalidate(id, filteredCacheParams);
    // keep track of non-stale (invaldiated) queries
    // in oldInput in order to trick `run`
    delete oldInput[id];

    Object.keys(children)
      .map(k => children[k])
      // only invalidate active (part of input)
      // queries from the down set
      .filter(({ query: { id } }) => !!input[id])
      .forEach(_invalidate);
  };

  Object.keys(invalidate).map(k => input[k]).forEach(_invalidate);

  return runLocal({
    ...more,
    state, cache,
    input,
    oldInput
  }).then(fresh => ({ ...result, ...fresh }));
}

// export function invalidateRemote() {}
