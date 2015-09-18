import t from 'tcomb';

const Dependency = t.struct({
  // dep on this query
  query: t.Any, // circular, fixed below

  // mapping its result as
  // (this should minimize size of dep. results):
  map: t.Func,

  // override cache params from this dep
  cacheParams: t.maybe(t.list(t.Str))
}, 'Dependency');

const CacheMode = t.enums.of([
  // (default): results for this q. are never stored in cache
  'no',
  // results are stored and always returned from cache,
  // a re-fetch is always re-issued at every pass
  'optimistic',
  // results are always stored, never invalidated
  // (without manual intervention, never re-fetched)
  'manual'
], 'CacheMode');

// unique string id for the query
const QueryId = t.Str;

export const Query = t.struct({
  // here for simplicity for now
  id: QueryId,

  // define caching policy for this query
  cache: t.maybe(CacheMode),

  // cache params should default to all params + all deps params
  // this overrides caching of state params
  // deps cache params can be overridden in dep definition
  cacheParams: t.maybe(t.list(t.Str)),

  // dictionary of deps. { [queryId]: dep.map(queryRes), ... }
  dependencies: t.maybe(t.dict(QueryId, Dependency)),

  // state: t.Obj -> depFetchParams: t.Obj -> Promise[t.Obj]
  fetch: t.Func
}, 'Query');

Dependency.meta.props.query = Query;


export const Command = t.struct({
  // an optional list of queries to invalidate
  invalidates: t.maybe(t.list(Query)),

  // actual command
  run: t.Func // state: t.Obj -> Promise[Any]
}, 'Command');


const CacheParam = t.subtype(t.Any, p => {
  return t.Str.is(p) || t.Num.is(p) || t.Bool.is(p);
}, 'CacheParam');

export const CacheParams = t.dict(
  t.Str,
  t.dict(t.Str, CacheParam),
  'CacheParams'
);


export const AvengerInput = t.dict(t.Any, Query, 'AvengerInput');

// build here

const QueryNodeEdges = t.dict(t.Str, t.Any, 'QueryNodeEdges'); // circular, fixed below

export const QueryNode = t.struct({
  // the query
  query: Query,
  // dependencies
  parents: QueryNodeEdges,
  // dependants
  children: QueryNodeEdges
}, 'QueryNode');

QueryNodeEdges.meta.codomain = QueryNode;

export const QueryNodes = QueryNodeEdges;

const StateKey = t.subtype(
  t.Any,
  v => t.Str.is(v) || t.Num.is(v) || t.Bool.is(v),
  'StateKey'
);
export const State = t.dict(t.Str, StateKey, 'State');

// export const Value = t.struct({
//   val: t.Any,
//   meta: t.struct({
//     cached: t.Bool,
//     error: t.Bool,
//     loading: t.Bool
//   })
// }, 'Value');
