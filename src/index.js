import t from 'tcomb';
import debug from 'debug';
import EventEmitter3 from 'eventemitter3';
import Query from './Query';
import AvengerCache from './AvengerCache';
import AvengerInput from './AvengerInput';
import Command from './Command';
import { run, fromCache, runCached, invalidate,
  minimizeCache as internalMinimizeCache,
  getQueriesToSkip as internalGetQueriesToSkip,
  upset as internalUpset,
  setCache as internalSetCache } from './internals';
import assign from 'lodash/object/assign';

const log = debug('Avenger');

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

export Query from './Query';

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

  off(...args) {
    this.emitter.off(...args);
  }

  getAvengerInput() {
    return AvengerInput({
      queries: Object.keys(this.input.queries).map(qId => ({
        query: this.allQueries[qId],
        params: this.input.state
      }))
    });
  }

  cached() {
    const cached = fromCache(this.getAvengerInput(), this.cache);
    const cachedWithMeta = assign({}, cached, {
      _meta: Object.keys(this.input.queries).reduce((ac, qId) => assign(ac, {
        [qId]: {
          // DUMB
          cached: !!cached[qId],
          loading: !cached[qId] || this.allQueries[qId].cache === 'optimistic'
        }
      }), {})
    });
    this.emitter.emit('change', cachedWithMeta);
    log('from cache', cachedWithMeta);
    return cachedWithMeta;
  }

  run() {
    if (this.fromRecipe) {
      log('running from recipe', this);
      // running from recipe.
      const { fetchParams, queriesToSkip } = this.fromRecipe;
      // not emitting events here for simplicity
      return runCached(this.getAvengerInput(), fetchParams, queriesToSkip);
    } else {
      // entire run is local
      log('running local', this);
      log('cache state', this.cache.state);

      const { _meta: prevMeta } = this.cached();

      return run(this.getAvengerInput(), this.cache).then(result => {
        const resultWithMeta = assign({}, result, {
          _meta: Object.keys(this.input.queries).reduce((ac, qId) => assign(ac, {
            [qId]: {
              // DUMB
              cached: prevMeta[qId].cached && [null, undefined, 'no', 'manual', 'immutable'].indexOf(this.allQueries[qId].cache) !== -1,
              loading: false
            }
          }), {})
        });
        this.emitter.emit('change', resultWithMeta);
        log('final result', resultWithMeta);
        log('final cache', this.cache.state);
        return resultWithMeta;
      });
    }
  }

  runCommand(cmd) {
    if (process.env.NODE_ENV !== 'production') {
      t.assert(Command.is(cmd));
    }

    // TODO(gio): not supporting `remote` yet
    if (this.fromRecipe) {
      throw new Error('not supporting `remote` yet');
    }

    // entire run is local
    log('running cmd local', this, cmd);

    return cmd.run(this.input.state).then((commandResult) => {
      // command executed successfully here, invalidate cache
      invalidate(this.getAvengerInput(), this.cache, cmd);
      log('cache state after command invalidation', this.cache.state);
      // and re-fetch
      return this.run().then(() => commandResult);
    });
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

  constructor(queries = {}, data = {}, input) {
    this.queries = AllQueries(queries);
    this.cache = new AvengerCache({});

    if (input) {
      const avInput = new QuerySet(this.queries, input, this.cache).getAvengerInput();
      internalSetCache(avInput, data, this.cache);
    }
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

  patchCache(input, data) {
    const avInput = new QuerySet(this.queries, input, this.cache).getAvengerInput();
    internalSetCache(avInput, data, this.cache);
  }

}
