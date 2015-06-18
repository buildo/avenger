import debug from 'debug';
import t from 'tcomb';
import Query from './Query';
import AvengerInput from './AvengerInput';
import { upset, actualizeParameters, getQueriesToSkip, minimizeCache, schedule as scheduleInternal, smoosh, setCache } from './internals';

export Query from './Query';
export AvengerInput from './AvengerInput';
export AvengerCache from './AvengerCache';

const log = debug('Avenger');

export function schedule(avengerInput, cache) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
  }

  const inputUpset = upset(avengerInput);
  const fetchers = actualizeParameters(inputUpset);
  const minimizedCache = minimizeCache(inputUpset, cache);
  const queriesToSkip = getQueriesToSkip(inputUpset, cache);

  const { implicitState = {}, queries } = avengerInput;
  const actualized = actualizeParameters(avengerInput);
  log('actualizedInput: %o', actualized);

  return scheduleInternal(inputUpset, fetchers, minimizedCache, queriesToSkip).then(output => {
    setCache(inputUpset, output, cache);
    return smoosh(avengerInput, output, cache);
  });
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
