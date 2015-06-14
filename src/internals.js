import debug from 'debug';
import t from 'tcomb';
import assign from 'lodash/object/assign';
import { allValues } from './util';
import AvengerInput from './AvengerInput';
import { AvengerActualizedInput } from './AvengerInput';

const log = debug('Avenger:internals');

export function upset(input) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(input) || AvengerActualizedInput.is(input));
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
    log(`mapping ${k}`);
    const originalQuery = input.queries.filter(({ query }) => query.id === k)[0];
    log(`original %o`, originalQuery);
    const params = originalQuery ? originalQuery.params : null;
    log(`params %o`, params);
    return {
      query: res[k],
      params
    };
  });

  // FIXME(gio) should be used both before and after actualization,
  // but this is ugly
  const returnType = AvengerActualizedInput.is(input) ? AvengerActualizedInput : AvengerInput;
  return returnType(assign({}, input, {
    queries
  }));
}

// export function actualizeFetchParams(AvengerInput input, ActualizedCache actualizedCache) {} -> AvengerActualizedInput

export function actualizeParameters(input) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerActualizedInput.is(input));
  }

  const fetcherInput = upset(input).queries.map((query) => {
    const ai = input.queries.filter((i) =>
      i.query === query
    )[0];
    const params = ai ? ai.params : {};
    return {
      id: query.id,
      query: query,
      fetcher: query.fetch(params)
    };
  });
  return AvengerFetcherInput(fetcherInput);
}

const cacheables = ['optimistic', 'manual', 'immutable'];
// FIXME(gio): null handles the default 'no' cache case
// better written as a default somewhere else...
const fetchables = [null, 'no', 'optimistic'];

export function scheduleActualized(actualized, implicitState = {}, actualizedCache = {}) {
  function _schedule(curr) {
    return curr.map((c) => {
      if (!c.promise) {
        log(`considering '${c.query.id}'`);

        const dependentPrepareds = (c.query.dependencies || []).map((d) =>
          actualized.filter((p) => p.query.id === d.query.id)[0]);
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
          const fetcherParams = Object.keys(fetchResults).map((frk) =>
            mang[frk](fetchResults[frk])
          );

          const cache = (actualizedCache[c.query.id] || { set: () => {} });
          const isCacheable = cacheables.indexOf(c.query.cache) !== -1;
          const isCached = isCacheable && !!cache.value;
          const isFetchable = fetchables.indexOf(c.query.cache) !== -1;
          const needsFetch = (isCacheable && !isCached) || isFetchable;
          log(`resolve allValues for ${c.query.id}, making cache decisions: isCacheable: ${isCacheable}, isCached: ${isCached}, isFetchable: ${isFetchable}, needsFetch: ${needsFetch}`);

          return new Promise(resolve => {
            if (isCached) {
              resolve(cache.value);
            }
            if (needsFetch) {
              allValues(c.fetcher(...fetcherParams, implicitState)).then(result => {
                if (isCacheable) {
                  cache.set(result);
                }
                if (!isCached) {
                  resolve(result);
                }
              });
            }
          });
        });
      }
      return c.promise;
    });
  }

  return Promise.all(_schedule(actualized));
}
