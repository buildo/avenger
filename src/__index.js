import t from 'tcomb';
import EventEmitter3 from 'eventemitter3';
import { Query, AvengerCache, schedule, AvengerInput } from './index';

const AllQueries = t.dict(t.Str, Query, 'AllQueries');
const Queries = t.dict(t.Str, t.Any, 'Queries')
const StateKey = t.subtype(
  t.Any,
  v => t.Str.is(v) || t.Num.is(v) || t.Bool.is(v),
  'StateKey'
);
const State = t.dict(t.Str, StateKey, 'State');

export const QuerySetInput = t.struct({
  queries: Queries,
  state: t.maybe(State)
}, 'QuerySetInput');

class QuerySet {

  constructor(allQueries, input, cache) {
    this.input = QuerySetInput(input);
    this.allQueries = allQueries;

    Object.keys(input.queries).forEach(qId => {
      t.assert(Query.is(this.allQueries[qId]), `Invalid query id: '${qId}'`);
    });

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
    // todo should emit cache event first
    return schedule(AvengerInput({
      queries
    }), this.cache).then(result => {
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

}