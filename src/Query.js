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
  fetch: t.Func(t.Any, t.Func(t.Any, t.Any))
}, 'Query');

Dependency.meta.props.query = Query;

module.exports = Query;
