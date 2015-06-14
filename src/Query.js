import t from 'tcomb';

const Type = t.Any;

const Dependency = t.struct({
  query: t.Any,
  fetchParams: t.Func
}, 'Dependency');

const CacheMode = t.enums.of([
  'no', 'optimistic', 'manual', 'immutable'
], 'CacheMode');

const Query = t.struct({
  id: t.Str,
  cache: t.maybe(CacheMode),
  paramsType: Type,
  fetchResultType: Type,
  dependencies: t.maybe(t.list(Dependency)),
  fetch: t.Func // paramsType -> Any -> fetchResultType
}, 'Query');

Dependency.meta.props.query = Query;

export default Query;

// ActualizedQuery

const ActualizedDependency = Dependency.extend({
  actualizedFetchParams: t.maybe(t.Obj)
}, 'ActualizedDependency');

// FIXME(gio): not sure if there's an easier way using .extend()
export const ActualizedQuery = t.struct({
  id: t.Str,
  cache: t.maybe(CacheMode),
  paramsType: Type,
  fetchResultType: Type,
  dependencies: t.maybe(t.list(ActualizedDependency)),
  fetch: t.Func // paramsType -> Any -> fetchResultType
}, 'ActualizedQuery');

// FetcherQuery

export const FetcherQuery = ActualizedQuery.extend({
  fetcher: t.Func // Any -> fetchResultType
}, 'FetcherQuery');
