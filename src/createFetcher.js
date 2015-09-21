import union from 'lodash/array/union';
import t from 'tcomb';
import { collect, error } from './util';

export default function createFetcher({ multiDep, ...args }) {
  function createFetcherInner({ id, fetch, cacheMode, cacheParams, depsParams, state, cache, emit, reject }) {
    if (process.env.NODE_ENV !== 'production') {
      // check for duplicate keys in state and depsParams
      const stateKeys = Object.keys(state);
      const depsKeys = Object.keys(depsParams);
      t.assert(union(stateKeys, depsKeys).length === stateKeys.length + depsKeys.length, `duplicate keys between state params and dependencies params for query ${id}. state:`, state, 'deps:', depsParams);
    }

    const cacheable = cacheMode && cacheMode !== 'no';
    const allParams = { ...state, ...depsParams };
    const allKeys = Object.keys(allParams);
    const filteredKeys = allKeys.filter(k => (cacheParams ? Object.keys(cacheParams) : allKeys).indexOf(k) !== -1);

    // TODO(gio): should check params are actually there and typecheck
    const filteredCacheParams = filteredKeys.reduce(
      ...collect(
        allParams,
        (v, k) => cacheParams && t.Func.is(cacheParams[k]) ? cacheParams[k](v) : v
      )
    );
    const fromCache = cacheable && cache.get(id, filteredCacheParams);
    const needsFetch = cacheMode === 'optimistic' || !fromCache;

    emit({
      id,
      cache: !!fromCache,
      loading: needsFetch
    }, fromCache || null);

    if (needsFetch) {
      return fetch(state)(depsParams).then(res => {
        emit({ id }, res);
        if (cacheable) {
          cache.set(id, filteredCacheParams)(res);
        }
        return res;
      }, error(emit, id, reject)).catch(error(emit, id, reject));
    } else {
      return Promise.resolve(fromCache);
    }
  }

  if (multiDep && multiDep.key) {
    const multiParams = args.depsParams[multiDep.key];
    t.assert(t.Arr.is(multiParams), `Invalid (non-Array) result for dependency param ${multiDep.key} (among ${args.id} params)`);

    const emit = index => (meta, value) => {
      args.emit({
        ...meta,
        multi: true,
        multiIndex: index
      }, value);
    };

    return Promise.all(
      multiParams.map(multiDep.map).map((v, i) => createFetcherInner({
        ...args,
        emit: emit(i),
        depsParams: {
          ...args.depsParams,
          [multiDep.key]: v
        }
      }))
    ).then(res => {
      // TODO(gio): should also emit for the aggregated INITIAL value?
      args.emit({
        id: args.id,
        multi: true,
        multiAll: true
      }, res);
      return res;
    }, err => {
      throw err;
    });
  } else {
    return createFetcherInner(args);
  }
}
