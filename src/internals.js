import debug from 'debug';
import t from 'tcomb';
import assign from 'lodash/object/assign';
import zip from 'lodash/array/zip';
import { allValues } from './util';
import AvengerInput from './AvengerInput';

const log = debug('Avenger:internals');

export function upset(input) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(input));
  }

  const res = {};
  function _upset(inputQueries) {
    inputQueries.map((q) => {
      res[q.id] = q;
      if (q.dependencies) {
        _upset(q.dependencies.map((d) => d.query));
      }
    });
  }
  _upset(input.queries.map(({ query }) => query));

  // TODO: should handle params spreading on added queries
  const queries = Object.keys(res).map(k => {
    const originalQuery = input.queries.filter(({ query }) => query.id === k)[0];
    const params = originalQuery ? originalQuery.params : null;
    return {
      query: res[k],
      params
    };
  });

  return AvengerInput(assign({}, input, {
    queries
  }));
}
// FIXME(gio): null handles the default 'no' cache case
//
// better written as a default somewhere else...
const fetchables = [null, 'no', 'optimistic'];

export function upsetParams(avengerInput, inQuery) {
  const res = {};
  function _upset(inputQueries) {
    inputQueries.map((q) => {
      res[q.id] = q;
      if (q.dependencies) {
        _upset(q.dependencies.map((d) => d.query));
      }
    });
    return Object.values(res);
  }
  const __upset = _upset(avengerInput.queries.filter(({ query }) => query === inQuery).map((q) => q.query))
  return __upset.map((query) => ({
    [query.id]: (avengerInput.queries.filter((q) => q.query === query)[0] || {params: null}).params || {}
  })).reduce((ac, item) => assign(ac, item), {});
}

export function minimizeCache(avengerInput, cache) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
  }

  return avengerInput.queries.filter(({ query }) => fetchables.indexOf(query.cache) !== -1).map((queryRef) => {
    const minCache = (queryRef.query.dependencies || []).filter(({ cache }) => cache !== 'no').map(({ query: depQuery, fetchParams }) => {

      return {
        [depQuery.id]: fetchParams(cache.get(depQuery.id, upsetParams(avengerInput, depQuery)))
      }
    }).reduce((ac, item) => assign(ac, item), {});
    return { [queryRef.query.id]: minCache };
  }).reduce((ac, item) => assign(ac, item), {});
}

export function actualizeParameters(input) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(input));
  }

  return input.queries.map(q => ({
    [q.query.id]: q.query.fetch(q.params || {})
  })).reduce((ac, item) => assign(ac, item), {});
}

const cacheables = ['optimistic', 'manual', 'immutable'];

export function getQueriesToSkip(avengerInput, cache) {
  return avengerInput.queries.filter(({ query }) => {
    const retrieved = cache.get(query.id, upsetParams(avengerInput, query));
    const isCacheable = cacheables.indexOf(query.cache) !== -1;
    const isCached = isCacheable && !!retrieved;
    const isFetchable = fetchables.indexOf(query.cache) !== -1;
    const needsFetch = (isCacheable && !isCached) || isFetchable;
    log(`${query.id}, making cache decisions: isCacheable: ${isCacheable}, isCached: ${isCached}, isFetchable: ${isFetchable}, needsFetch: ${needsFetch}`);
    return !needsFetch;
  }).map(({ query }) => query.id);
}

export function schedule(avengerInput, fetchers, minimizedCache, queriesToSkip = []) {
  const { implicitState } = avengerInput;
  const queryRefs = avengerInput.queries.map((marmelade) => ({
    ...marmelade,
    fetcher: fetchers[marmelade.query.id]
  }));
  
  function _schedule(curr) {
    return curr.map((c) => {
      if (!c.promise) {
        log(`considering '${c.query.id}'`);

        const dependentPrepareds = (c.query.dependencies || []).map((d) => {
          return queryRefs.filter((p) => p.query.id === d.query.id)[0];
        });
        log(`'${c.query.id}' depends on: [${dependentPrepareds.map(({ query }) => query.id).join(', ')}]`);

        _schedule(dependentPrepareds);
        const ids = dependentPrepareds.map((p) => p.query.id);
        const promises = dependentPrepareds.map((p) => p.promise);
        const fetchParams = dependentPrepareds.map((p) =>
            c.query.dependencies.filter((d) => d.query === p.query)[0].fetchParams);

        const gnam = {};
        const mang = {};
        for (var i = 0; i < ids.length; i++) {
          gnam[ids[i]] = promises[i];
          mang[ids[i]] = fetchParams[i];
        }
        log(`scheduling '${c.query.id}'`);

        c.promise = allValues(gnam).then((fetchResults) => {
          if (queriesToSkip.indexOf(c.query.id) === -1) {
            const fetcherParams = Object.keys(fetchResults).map((frk) =>
              (!!fetchResults[frk]) ?
                mang[frk](fetchResults[frk]) :
                minimizedCache[c.query.id][frk]
            );

            return allValues(c.fetcher(...fetcherParams, implicitState));
          } else {
            return Promise.resolve(null);
          }
        });
      }
      return c.promise;
    });
  }

  return Promise.all(_schedule(queryRefs)).then((output) =>
      zip(output, queryRefs.map(({query}) => query.id)).map(([r, id]) => ({
        [id]: r
      })).reduce((ac, item) => assign(ac, item), {}));
}

export function smoosh(avengerInput, fetchResults, cache) {
  avengerInput.queries.map(({ query }) => ({
    [query.id]: fetchResults[query.id] || cache.get(query.id, upsetParams(avengerInput, query))
  })).reduce((ac, item) => assign(ac, item), {});
}

export function setCache(avengerInput, fetchResults, cache) {
  Object.keys(fetchResults).map((frk) => {
    console.log(frk);
    cache.set(frk, upsetParams(avengerInput,
          avengerInput.queries.filter(({ query }) => query.id === frk)[0].query))(
        fetchResults[frk]);
  });
}
