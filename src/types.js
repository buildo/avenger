import t, { isType } from 'tcomb';

export const PromiseType = t.irreducible('Promise', v => v instanceof Promise);

// unique string id for the query
const QueryId = t.String;

const Dependency = t.struct({
  // dep on this query
  query: t.Any, // circular, fixed below

  // mapping its result as
  // (this should minimize size of dep. results):
  map: t.Function,

  // TODO(gio): unused. use Query.cacheParams instead
  // override cache params from this dep
  // cacheParams: t.maybe(t.list(t.String)),

  // run dependent query (this query) once for
  // each value returned by dependency query.
  // make sure the query (or this dep. `map` fn) returns an array.
  // optionally provide a function here to map multi-results.
  // defaults to an array, same size as input array
  multi: t.maybe(t.union([t.Boolean, t.Function]))
}, 'Dependency');

const Dependencies = t.maybe(t.refinement(
  t.dict(QueryId, Dependency),
  // TODO(gio): looks like a dumb/arbitrary limitation?
  // only a single `multi` dependency is allowed
  deps => Object.keys(deps).map(k => deps[k]).filter(({ multi }) => !!multi).length <= 1,
  'Dependencies'
));

const CacheMode = t.enums.of([
  // (default): results for this q. are never stored in cache
  'no',

  // results are stored and always returned from cache,
  // a re-fetch is always re-issued at every pass
  'optimistic',

  // results are always stored in cache, never invalidated
  // (without manual intervention, never re-fetched)
  'manual'
], 'CacheMode');

const TcombType = t.irreducible('TcombType', isType);

const CacheParams = t.dict(t.String, TcombType, 'CacheParams');

export const Query = t.struct({
  // here for simplicity for now
  id: QueryId,

  // define caching policy for this query
  cache: t.maybe(CacheMode),

  // cache params should default to all params + all deps params
  // this overrides caching of state params.
  // optionally pass a function to map the cache param value
  // remember that cache params should be primitive
  cacheParams: t.maybe(CacheParams),

  // dictionary of deps. { [queryId]: dep.map(queryRes), ... }
  dependencies: Dependencies,

  // state: t.Object -> depFetchParams: t.Object -> Promise[t.Object]
  fetch: t.Function
}, 'Query');

Dependency.meta.props.query = Query;

export const AvengerInput = t.dict(t.Any, Query, 'AvengerInput');

export const Command = t.struct({
  // an optional list of queries to invalidate
  // entire downset for these will be invalidated as well
  invalidates: t.maybe(AvengerInput),

  // actual command
  run: t.Function // state: t.Object -> Promise[t.Any]
}, 'Command');

const QueryNodeEdges = t.dict(t.String, t.Any, 'QueryNodeEdges'); // circular, fixed below

// a single DAG node
export const QueryNode = t.struct({
  query: Query, // the query
  parents: QueryNodeEdges, // dependencies
  children: QueryNodeEdges // dependants
}, 'QueryNode');

QueryNodeEdges.meta.codomain = QueryNode;

export const QueryNodes = QueryNodeEdges;

export const StateKey = t.irreducible(
  'StateKey',
  v => t.Nil.is(v) || t.String.is(v) || t.Number.is(v) || t.Boolean.is(v) || t.Date.is(v),
);
export const State = t.dict(t.String, StateKey, 'State');

// cache internal state representation
export const CacheState = t.dict(t.String, t.dict(t.String, t.Any));

export const EmitMeta = t.struct({
  id: QueryId,
  error: t.maybe(t.Boolean),
  cache: t.maybe(t.Boolean),
  loading: t.maybe(t.Boolean),
  multi: t.maybe(t.Boolean),
  multiIndex: t.maybe(t.Number),
  multiAll: t.maybe(t.Boolean)
}, 'EmitMeta');

// export const MinimizedCache = t.dict(
//   // dependant qId
//   t.String,
//   t.dict(
//     // dependency qId
//     t.String,
//     // mapped (minimized) value
//     t.Any
//   ),
//   'MinimizedCache'
// );

// export const Value = t.struct({
//   val: t.Any,
//   meta: t.struct({
//     cached: t.Boolean,
//     error: t.Boolean,
//     loading: t.Boolean
//   })
// }, 'Value');
