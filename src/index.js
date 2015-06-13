import debug from 'debug';
import t from 'tcomb';
import { allValues } from './util';
import Query from './Query';
import AvengerInput from './AvengerInput';
import AvengerActualizedCache from './AvengerActualizedCache';
import { actualizeParameters } from './internals';

const log = debug('Avenger');

export Query from './Query';
export AvengerInput from './AvengerInput';

const cacheables = ['optimistic', 'manual', 'immutable'];
// FIXME(gio): null handles the default 'no' cache case
// better written as a default somewhere else...
const fetchables = [null, 'no', 'optimistic'];

export function schedule(avengerInput, actualizedCache = {}) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
    t.assert(AvengerActualizedCache.is(actualizedCache));
  }

  const { implicitState = {} } = avengerInput;
  const ps = actualizeParameters(avengerInput);
  log('actualizedInput: %o', ps);

  function _schedule(curr) {
    return curr.map((c) => {
      if (!c.promise) {
        log(`considering '${c.query.id}'`);

        const dependentPrepareds = (c.query.dependencies || []).map((d) =>
          ps.filter((p) => p.query.id === d.query.id)[0]);
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

  return Promise.all(_schedule(ps));
}

const FromJSONParams = t.struct({
  // TODO(gio) be more restrictive
  json: t.struct({
    queries: t.list(t.Any),
    implicitState: t.maybe(t.Obj)
  }),
  allQueries: t.dict(t.Str, Query)
}, 'FromJSONParams');

export function avengerInputFromJson(serialized) {
  const { json, allQueries } = new FromJSONParams(serialized);

  return AvengerInput({
    implicitState: json.implicitState,
    queries: json.queries.map(q => {
      if (process.env.NODE_ENV !== 'production') {
        t.assert(Object.keys(q).length === 1, `invalid format for query in: ${q}`);
      }
      const id = Object.keys(q)[0];
      if (process.env.NODE_ENV !== 'production') {
        t.assert(Query.is(allQueries[id]), `query not found: ${id}`);
      }
      return {
        query: allQueries[id],
        params: q[id]
      };
    })
  });
}

export function avengerInputToJson(avengerInput) {
  const { implicitState } = AvengerInput(avengerInput);
  const queries = avengerInput.queries.map(avIn => ({
    [avIn.query.id]: avIn.params || {}
  }));
  const json = { queries };
  if (implicitState) {
    json.implicitState = implicitState;
  }
  return json;
}
