import debug from 'debug';
import t from 'tcomb';
import assign from 'lodash/object/assign';
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

export function minimizeCache(avengerInput, cache) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
  }

  return avengerInput.queries.filter(({ queryRef }) => fetchables.indexOf(queryRef.query.cache) !== -1).map((queryRef) => {
    const minCache = queryRef.query.dependencies.filter(({ cache }) => cache !== 'no').map(({ depQuery, fetchParams }) => {
      const upsetParams = upset(avengerInput.queries.filter(({ query }) => query === depQuery)).map(({ query, params }) => ({
        [query.id]: params
      })).reduce((ac, item) => assign(ac, item), {});
      return {
        [depQuery.id]: fetchParams(cache.get(depQuery.id, upsetParams))
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

export function schedule(avengerInput, fetchers, minimizedCache) {
  const { implicitState } = avengerInput;
  const queryRefs = avengerInput.queries.map((marmelade) => ({
    ...marmelade,
    fetcher: fetchers[marmelade.query.id]
  }));
  
  function _schedule(curr) {
    return curr.map((c) => {
      if (!c.promise) {
        log(`considering '${c.query.id}'`);

        console.dir(c.query.dependencies);
        console.dir(queryRefs);
        const dependentPrepareds = (c.query.dependencies || []).map((d) => {
          console.log(d.query.id);
          return queryRefs.filter((p) => p.query.id === d.query.id)[0];
        });
        console.dir(dependentPrepareds);
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

          const cache = (minimizedCache[c.query.id] || { set: () => {} });
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
              console.dir(c);
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

  return Promise.all(_schedule(queryRefs));
}
