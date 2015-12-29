# Queries

A `Query` can be anything. The first obvious materialization of it is a network HTTP call to an API, but it can also be a synchronous action, such as a data transformation step. Generally speaking a `Query` is anything that returns a `Promise` and it can optionally express a dependency on other queries. Here's its formal definition (using [tcomb](https://github.com/gcanti/tcomb)):

```js
const QueryId = t.String;
export const Query = t.struct({
  id: QueryId,
  cache: t.maybe(CacheMode),
  cacheParams: t.maybe(CacheParams),
  dependencies: Dependencies,
  fetch: t.Function
}, 'Query');
```

Let's take a closer look.
Every query is identified by an `id`, which is a `String`. The `id` of a query is used to reference it from another query definition (see below).

The most important part of any query is the `fetch` function: this is where you define what the query actually does. It can be literally anything that returns a `Promise`; avenger doesn't have opinions about it. The actual type of `fetch` is (in pseudo-code):

```js
params: t.Object -> depFetchParams: t.Object -> result: Promise[t.Object]
```


It's a curried function, that takes a `params` object as first parameter (again, this can be anything); the second parameter is `depFetchParams` which is the combined result of all the other queries this query depends on; finally it returns a `Promise`.
We'll see more about dependencies in a second.
