# Caching

Queries can be cached, using different strategies. Here's the list of possible values:

```js
const CacheMode = t.enums.of(['no', 'optimistic', 'manual'], 'CacheMode');
```

Let's take a closer look:

- `no`
  - the default cache strategy. Results for this query won't be stored in cache.
- `optimistic`
  - results are stored and always returned from cache
  - every time the query is executed, the `fetch` is performed again
- `manual`
  - results are always stored and returned from cache
  - results are never invalidated automatically
  - `fetch` is re-performed only upon manual invalidation


Avenger doesn't make any assumption about cache serialization. It is totally up to you if you want to serialize your cache e.g. to `localStorage` when running in a browser. It is also up to you to make sure your cached data is serializable, avenger won't complain to store non-serializable data in memory.

Accessing and serializing the current cache state is as simple as:

```js
const serializedCacheState = JSON.stringify(av.cache.state);
```

And you can restore a previously serialized cache when creating a new avenger instance passing an optional constructor parameter:


```js
const avenger = new Avenger(universe, JSON.parse(serializedCacheState));
```

Cache is kept per-query. Invalidations are implicitly initiated after the successful execution of a [`Command`](Commands.html) or manually with the `invalidate` instance method:


```js
avenger.invalidate(querySet);
```

Read more about how `Command`s interact with the cache in the next section