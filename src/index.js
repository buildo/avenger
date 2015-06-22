import t from 'tcomb';
import EventEmitter3 from 'eventemitter3';
import Query from './Query';
import AvengerCache from './AvengerCache';
import AvengerInput from './AvengerInput';
import { run, fromCache } from './internals';

const AllQueries = t.dict(t.Str, Query, 'AllQueries');
const Queries = t.dict(t.Str, t.Any, 'Queries');
const StateKey = t.subtype(
  t.Any,
  v => t.Str.is(v) || t.Num.is(v) || t.Bool.is(v),
  'StateKey'
);
const State = t.dict(t.Str, StateKey, 'State');

// pre computed fetch params. Used for serialization
const FetchParams = t.dict(
  t.Str,    // depended upon qId
  t.dict(
    t.Str,  // dependent qId
    t.Obj   // dependent.deps.dependedUpon.fetchParams() result
  ),
  'FetchParams'
);

export const QuerySetInput = t.struct({
  queries: Queries,
  state: t.maybe(State)
}, 'QuerySetInput');

export const Recipe = QuerySetInput.extend({
  fetchParams: FetchParams
}, Recipe);

// export for tests
export class QuerySet {

  constructor(allQueries, input, cache) {
    this.input = QuerySetInput(input);
    this.allQueries = allQueries;

    if (process.env.NODE_ENV !== 'production') {
      Object.keys(input.queries).forEach(qId => {
        t.assert(Query.is(this.allQueries[qId]), `Invalid query id: '${qId}'`);
      });
    }

    this.emitter = new EventEmitter3();
    this.cache = cache;
  }

  on(...args) {
    this.emitter.on(...args);
  }

  run() {
    const queries = Object.keys(this.input.queries).map(qId => ({
      query: this.allQueries[qId],
      params: this.input.state
    }));
    const input = AvengerInput({
      queries
    });

    const cached = fromCache(input, this.cache);
    this.emitter.emit('change', cached);

    return run(input, this.cache).then(result => {
      this.emitter.emit('change', result);
      return result;
    });
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
    const { queries, state } = Recipe(recipe);
    const input = QuerySetInput({
      queries, state
    });
    return new QuerySet(this.queries, input, this.cache);
  }

}