import t from 'tcomb';
import EventEmitter3 from 'eventemitter3';
import Query from './Query';
import AvengerCache from './AvengerCache';
import AvengerInput from './AvengerInput';
import { run, fromCache, runCached,
  minimizeCache as internalMinimizeCache,
  getQueriesToSkip as internalGetQueriesToSkip,
  upset as internalUpset } from './internals';

const AllQueries = t.dict(t.Str, Query, 'AllQueries');
const Queries = t.dict(t.Str, t.Any, 'Queries');
const StateKey = t.subtype(
  t.Any,
  v => t.Str.is(v) || t.Num.is(v) || t.Bool.is(v),
  'StateKey'
);
const State = t.dict(t.Str, StateKey, 'State');

// pre computed fetch params. Used for serialization
// output of internals/minimizeCache
const FetchParams = t.dict(
  t.Str,    // qId
  t.dict(
    t.Str,  // dependency qId
    t.Any   // dependency cached value
  ),
  'FetchParams'
);

export const QuerySetInput = t.struct({
  queries: Queries,
  state: t.maybe(State)
}, 'QuerySetInput');

export const Recipe = QuerySetInput.extend({
  fetchParams: FetchParams,
  queriesToSkip: t.list(t.Str)
}, Recipe);

// export for tests
export class QuerySet {

  constructor(allQueries, input, cache = null, fromRecipe = null) {
    this.input = QuerySetInput(input);
    this.allQueries = allQueries;

    if (process.env.NODE_ENV !== 'production') {
      Object.keys(input.queries).forEach(qId => {
        t.assert(Query.is(this.allQueries[qId]), `Invalid query id: '${qId}'`);
      });
    }

    this.emitter = new EventEmitter3();
    this.cache = cache;
    this.fromRecipe = fromRecipe;
  }

  on(...args) {
    this.emitter.on(...args);
  }

  getAvengerInput() {
    return AvengerInput({
      queries: Object.keys(this.input.queries).map(qId => ({
        query: this.allQueries[qId],
        params: this.input.state
      }))
    });
  }

  run() {
    if (this.fromRecipe) {
      // running from recipe.
      const { fetchParams, queriesToSkip } = this.fromRecipe;
      // not emitting events here for simplicity
      return runCached(this.getAvengerInput(), fetchParams, queriesToSkip);
    } else {
      // entire run is local
      const cached = fromCache(this.getAvengerInput(), this.cache);
      this.emitter.emit('change', cached);

      return run(this.getAvengerInput(), this.cache).then(result => {
        this.emitter.emit('change', result);
        return result;
      });
    }
  }

  toRecipe() {
    const { queries, state } = this.input;
    const fetchParams = internalMinimizeCache(this.getAvengerInput(), this.cache);
    const queriesToSkip = internalGetQueriesToSkip(internalUpset(this.getAvengerInput()), this.cache);
    return {
      queries, state, fetchParams, queriesToSkip
    };
  }

}

export default class Avenger {

  constructor(queries = {}, cacheInitialState = {}) {
    this.queries = AllQueries(queries);
    this.cache = new AvengerCache(cacheInitialState);
  }

  querySet(input) {
    return new QuerySet(this.queries, input, this.cache);
  }

  querySetFromRecipe(recipe) {
    const { queries, state, fetchParams, queriesToSkip } = Recipe(recipe);
    const input = QuerySetInput({
      queries, state
    });
    return new QuerySet(this.queries, input, null, { fetchParams, queriesToSkip });
  }

}