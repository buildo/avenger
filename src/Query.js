const t = require('tcomb');

const Type = t.Any;

const Dependency = t.struct({
  query: t.Any,
  fetchParams: t.Func,
  multi: t.maybe(t.Str)
});

const Query = t.struct({
  name: t.Str,
  paramsType: Type,
  fetchResultType: Type,
  dependencies: t.maybe(t.list(Dependency)),
  fetch: t.Func // paramsType -> Any -> fetchResultType
}, 'Query');

Dependency.meta.props.query = Query;

module.exports = Query;
