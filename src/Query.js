const t = require('tcomb');

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

module.exports = Query;
