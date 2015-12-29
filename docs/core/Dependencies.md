# Dependencies

The bread and butter of avenger is solving query dependencies.
A query is dependent on another when it needs data from the first query before being able to execute.

TODO: example of query dependency

Let's first see the definition of a `Dependency`:

```js
const Dependency = t.struct({
  query: t.Any,
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
```
…