import t from 'tcomb';

// unique string id for the query
const QueryId = t.Str;

const Dependency = t.struct({
  // dep on this query
  query: t.Any, // circular, fixed below

  // mapping its result as
  // (this should minimize size of dep. results):
  map: t.Func,

  // TODO(gio): unused. use Query.cacheParams instead
  // override cache params from this dep
  // cacheParams: t.maybe(t.list(t.Str)),

  // run dependent query (this query) once for
  // each value returned by dependency query.
  // make sure the query (or this dep. `map` fn) returns an array.
  // optionally provide a function here to map multi-results.
  // defaults to an array, same size as input array
  multi: t.maybe(t.union([t.Bool, t.Func]))
}, 'Dependency');

const Dependencies = t.maybe(t.subtype(
  t.dict(QueryId, Dependency),
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
  // results are always stored, never invalidated
  // (without manual intervention, never re-fetched)
  'manual'
], 'CacheMode');

export const Query = t.struct({
  // here for simplicity for now
  id: QueryId,

  // define caching policy for this query
  cache: t.maybe(CacheMode),

  // cache params should default to all params + all deps params
  // this overrides caching of state params.
  // optionally pass a function to map the cache param value
  // remember that cache params should be primitive
  cacheParams: t.maybe(t.dict(t.Str, t.union([t.Bool, t.Func]))),

  // dictionary of deps. { [queryId]: dep.map(queryRes), ... }
  dependencies: Dependencies,

  // state: t.Obj -> depFetchParams: t.Obj -> Promise[t.Obj]
  fetch: t.Func
}, 'Query');

Dependency.meta.props.query = Query;


export const Command = t.struct({
  // an optional list of queries to invalidate
  // entire downset for these will be invalidated as well
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

const QueryNodeEdges = t.dict(t.Str, t.Any, 'QueryNodeEdges'); // circular, fixed below

// a single DAG node
export const QueryNode = t.struct({
  query: Query, // the query
  parents: QueryNodeEdges, // dependencies
  children: QueryNodeEdges // dependants
}, 'QueryNode');

QueryNodeEdges.meta.codomain = QueryNode;

export const QueryNodes = QueryNodeEdges;

export const StateKey = t.subtype(
  t.Any,
  v => t.Str.is(v) || t.Num.is(v) || t.Bool.is(v),
  'StateKey'
);
export const State = t.dict(t.Str, StateKey, 'State');

export const MinimizedCache = t.dict(
  // dependant qId
  t.Str,
  t.dict(
      // dependency qId
      t.Str,
      // mapped (minimized) value
      t.Any
  ),
  'MinimizedCache'
);

// export const Value = t.struct({
//   val: t.Any,
//   meta: t.struct({
//     cached: t.Bool,
//     error: t.Bool,
//     loading: t.Bool
//   })
// }, 'Value');
