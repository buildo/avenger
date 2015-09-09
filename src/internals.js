import debug from 'debug';
import t from 'tcomb';
import assign from 'lodash/object/assign';
import values from 'lodash/object/values';
import pick from 'lodash/object/pick';
import zip from 'lodash/array/zip';
import { allValues } from './util';
import AvengerInput from './AvengerInput';

const log = debug('Avenger:internals');

// FIXME(gio): null handles the default 'no' cache case
//
// better written as a default somewhere else...
const fetchables = [undefined, null, 'no', 'optimistic'];
const cacheables = ['optimistic', 'manual', 'immutable'];

// full local run
export function run(avengerInput, cache) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
  }

  const inputUpset = upset(avengerInput);
  const fetchers = actualizeParameters(inputUpset);
  const minimizedCache = minimizeCache(inputUpset, cache);
  const queriesToSkip = getQueriesToSkip(inputUpset, cache);

  return schedule(inputUpset, fetchers, minimizedCache, queriesToSkip).then(output => {
    setCache(inputUpset, output, cache);
    return smoosh(avengerInput, output, cache);
  });
}

// run() a command
export function runCommand(avengerInput, cache, cmd) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
    t.assert(Command.is(cmd));
  }

  return 
}

// invalidate for given command
export function invalidate(avengerInput, cache, cmd) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
    t.assert(Command.is(cmd));
  }

  return 
}

// run from recipe
export function runCached(avengerInput, minimizedCache, queriesToSkip) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
  }

  const inputUpset = upset(avengerInput);
  const fetchers = actualizeParameters(inputUpset);

  return schedule(inputUpset, fetchers, minimizedCache, queriesToSkip).then(output => smooshWithoutCache(avengerInput, output));
}

// extract cached data only
export function fromCache(avengerInput, cache) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
  }

  const inputUpset = upset(avengerInput);
  log('upset: %o', inputUpset);

  const cached = inputUpset.queries.filter(
    ({ query }) => cacheables.indexOf(query.cache) !== -1
  ).map(
    ({ query }) => ({
      [query.id]: cache.get(query.id, upsetParams(inputUpset, query))
    })
  ).reduce((ac, c) => assign(ac, c), {});

  return cached;
}

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

export function upsetParams(avengerInput, inQuery) {
  const res = {};
  function _upset(inputQueries) {
    inputQueries.map((q) => {
      res[q.id] = q;
      if (q.dependencies) {
        _upset(q.dependencies.map((d) => d.query));
      }
    });
    return values(res);
  }
  const __upset = _upset(avengerInput.queries.filter(({ query }) => query === inQuery).map((q) => q.query));
  return __upset.map(query => {
    const allParams = (avengerInput.queries.filter((q) => q.query === query)[0] || {params: null}).params || {};
    return {
      [query.id]: query.id === inQuery.id ? pick(allParams, inQuery.cacheParams) : allParams
    };
  }).reduce((ac, item) => assign(ac, item), {});
}

const minLog = debug('Avenger:internals:minimizeCache');
export function minimizeCache(avengerInput, cache) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
  }

  return avengerInput.queries.map((queryRef) => {
    minLog(`building minCache for ${queryRef.query.id}, deps: %o`, (queryRef.query.dependencies || []).map(({ query }) => query.id));
    const minCache = (queryRef.query.dependencies || [])
      .filter(({ query }) => cacheables.indexOf(query.cache) !== -1)
      .filter(({ query }) => !!cache.get(query.id, upsetParams(avengerInput, query)))
      .map(({ query: depQuery, fetchParams }) => {
      minLog(`dependency ${depQuery.id} minCache: %o`, fetchParams(cache.get(depQuery.id, upsetParams(avengerInput, depQuery))));

      return {
        [depQuery.id]: fetchParams(cache.get(depQuery.id, upsetParams(avengerInput, depQuery)))
      };
    }).reduce((ac, item) => assign(ac, item), {});
    minLog(`${queryRef.query.id} minCache: %o`, minCache);
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

export function getQueriesToSkip(avengerInput, cache) {
  return avengerInput.queries.filter(({ query }) => {
    const retrieved = cache.get(query.id, upsetParams(avengerInput, query));
    log(`${query.id} retrieved: %o`, retrieved);
    const isCacheable = cacheables.indexOf(query.cache) !== -1;
    const isCached = isCacheable && !!retrieved;
    const isFetchable = fetchables.indexOf(query.cache) !== -1;
    const needsFetch = (isCacheable && !isCached) || isFetchable;
    log(`${query.id}, making cache decisions: isCacheable: ${isCacheable}, isCached: ${isCached}, isFetchable: ${isFetchable}, needsFetch: ${needsFetch}`);
    return !needsFetch;
  }).map(({ query }) => query.id);
}

export function schedule(avengerInput, fetchers, minimizedCache, queriesToSkip = []) {
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
              (fetchResults[frk]) ?
                mang[frk](fetchResults[frk]) :
                minimizedCache[c.query.id][frk]
            );
            log(`fetchResults %o, fetcherParams %o`, fetchResults, fetcherParams);

            return allValues(c.fetcher(...fetcherParams));
          } else {
            log(`minimizedCache %o`, minimizedCache);
            return Promise.resolve(null);
          }
        });
      }
      return c.promise;
    });
  }

  return Promise.all(_schedule(queryRefs)).then((output) =>
    zip(output, queryRefs.map(({query}) => query.id)).filter((x) => !!x[0]).map(([r, id]) => ({
      [id]: r
    })).reduce((ac, item) => assign(ac, item), {}));
}

export function smoosh(avengerInput, fetchResults, cache) {
  return avengerInput.queries.map(({ query }) => ({
    [query.id]: fetchResults[query.id] || cache.get(query.id, upsetParams(avengerInput, query))
  })).reduce((ac, item) => assign(ac, item), {});
}

export function smooshWithoutCache(avengerInput, fetchResults) {
  return avengerInput.queries.map(({ query }) => ({
    [query.id]: fetchResults[query.id]
  })).reduce((ac, item) => assign(ac, item), {});
}

export function setCache(avengerInput, fetchResults, cache) {
  Object.keys(fetchResults).map((frk) => {
    const query = avengerInput.queries.filter(({ query }) => query.id === frk)[0].query;
    if (cacheables.indexOf(query.cache) !== -1) {
      const upp = upsetParams(avengerInput, query);
      log(`set cache for ${query.id}, upsetParams %o`, upp);
      cache.set(query.id, upp)(fetchResults[frk]);
    }
  });
}
