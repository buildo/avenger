import t, { isType } from 'tcomb';

export const PromiseType = t.irreducible('Promise', v => v instanceof Promise);

// unique string id for the query
export const QueryId = t.String;

const Dependency = t.struct({
  // dep on this query
  query: t.Any, // circular, fixed below

  // mapping its result as
  // (this should minimize size of dep. results):
  map: t.maybe(t.Function)
}, 'Dependency');

const Dependencies = t.dict(QueryId, Dependency);

const CacheStrategy = t.enums.of([
  // (default): results for this q. are never stored in cache
  'no',

  // results are stored and always returned from cache,
  // a re-fetch is always re-issued at every pass
  'optimistic',

  // results are always stored in cache, never invalidated
  // (without manual intervention, never re-fetched)
  'manual'
], 'CacheStrategy');

const TcombType = t.irreducible('TcombType', isType);

const QueryParams = t.dict(t.String, TcombType, 'QueryParams');

export const Query = t.struct({
  id: QueryId,

  // define caching strategy for this query
  cacheStrategy: t.maybe(CacheStrategy),

  // typing for params passed to fetch()
  // params default to all params + all deps params
  // these are the same key:values used to store
  // each fetch() result in cache
  params: t.maybe(QueryParams),

  // dictionary of deps. { [paramName]: { query: queryReference } }
  dependencies: t.maybe(Dependencies),

  // state: query.params -> Promise[returnType]
  fetch: t.Function,

  returnType: t.maybe(TcombType)
}, 'Query');

const _upsetActualParams = {};
Object.defineProperty(Query.prototype, 'upsetActualParams', {
  get() {
    if (_upsetActualParams[this.id]) {
      return _upsetActualParams[this.id];
    } else {
      const deps = this.dependencies || {};
      _upsetActualParams[this.id] = {
        ...Object.keys(this.params || {}).filter(k => !deps[k]).reduce((ac, k) => ({
          ...ac, [k]: this.params[k]
        }), {}),
        ...Object.keys(deps).reduce((ac, k) => ({
          ...ac, ...this.dependencies[k].query.upsetActualParams
        }), {})
      };
      return _upsetActualParams[this.id];
    }
  }
});

Dependency.meta.props.query = Query;

export const Queries = t.dict(t.Any, Query, 'Queries');

export const CommandId = QueryId;

const CommandParams = QueryParams;

export const Command = t.struct({
  id: CommandId,

  // an optional set of queries to invalidate
  invalidates: t.maybe(Queries),

  params: t.maybe(CommandParams),

  // actual command
  run: t.Function // ...t.Any -> Promise[t.Any]
}, 'Command');

const _invalidateParams = {};
Object.defineProperty(Command.prototype, 'invalidateParams', {
  get() {
    if (_invalidateParams[this.id]) {
      return _invalidateParams[this.id];
    } else {
      const inv = this.invalidates || {};
      _invalidateParams[this.id] = Object.keys(inv).reduce((ac, k) => ({
        ...ac, ...inv[k].upsetActualParams
      }), {});
      return _invalidateParams[this.id];
    }
  }
});


// internal types

const ActionType = t.enums.of([
  'addQueries', 'removeQueries', 'setState',
  'setWaitingQueries', 'setFetchingQueriesAndLastState', 'setInvalidQueries', 'setInvalidFetchingQueries',
  'setValue', 'setError'
], 'ActionType');

export const Action = t.struct({
  type: ActionType,
  data: t.Any
}, 'Action');

export const GraphNode = t.struct({
  query: Query,
  activeCount: t.Number,
  waiting: t.maybe(t.Boolean),
  // TODO: make this a cancelablePromise instead?
  fetching: t.maybe(t.Boolean),
  invalid: t.maybe(t.Boolean),
  invalidFetching: t.maybe(t.Boolean),
  error: t.Any,
  value: t.Any,
  lastState: t.maybe(t.Object),
  fromCache: t.maybe(t.Boolean),
  timestamp: t.Number
}, 'GraphNode');

export const Graph = t.dict(t.String, GraphNode, 'GraphNode');

// export const StateKey = t.irreducible(
//   'StateKey',
//   v => t.Nil.is(v) || t.String.is(v) || t.Number.is(v) || t.Boolean.is(v) || t.Date.is(v),
// );
export const StateKey = t.Any; // TODO(gio): we are JSON.stringifying the world in cache keys instead
export const State = t.dict(t.String, StateKey, 'State');
