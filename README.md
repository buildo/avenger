# avenger

[![](https://travis-ci.org/buildo/anorm-extensions.svg)](https://travis-ci.org/buildo/avenger)
[![](https://img.shields.io/npm/v/avenger.svg?sytle=flat-square)](https://www.npmjs.com/package/avenger)
[![npm downloads](https://img.shields.io/npm/dm/avenger.svg?style=flat-square)](https://www.npmjs.com/package/avenger)
[![](https://david-dm.org/buildo/avenger.svg)](https://david-dm.org/buildo/avenger#info=dependencies&view=list)
[![](https://david-dm.org/buildo/avenger/dev-status.svg)](https://david-dm.org/buildo/avenger#info=devDependencies&view=list)

### TLDR

A CQRS-flavoured data fetching and caching layer in JavaScript.

Batching, caching, data-dependecies and manual invalidations in a declarative fashion for node and the browser.

### API layers

Avenger provides 3+ levels of apis:

- **layer 0** `fetch`: provides an abstraction over asyncronous data retrieval (`fetch`) and operators to compose different fetches together (`composition` and `product`). Includes data-dependencies and promise pipelining, and a prescription for api categorization.
- **layer 1** `fcache`: caching layer on top of `fetch`. Caching and batching happens here. This layer can be considered similar to [DataLoader](https://github.com/facebook/dataloader), adding more powerful caching strategies. You'd use this layer directly in a stateless (server-side) environment, where no long-living cache is involved.
- **layer 2** `query`: extends `fcache` with observable queries. On top of this, it provides the CQRS:command channel for mutations and optimistic updates. You'd use this layer in a stateful (client) environment, where the app interacts with a long-living cache of remote/async data.
- **layer** + [react-avenger](https://github.com/buildo/react-avenger): provides helpers to connect an avenger instance to React components in a declarative fashion. You'd use this layer in a generic React client


# Fetch

A `fetch` is a function with the following signature:

```
fetch: A -> Promise[P]
```

and we write `fetch: A ~> P` for short.

## Classification

Given a fetch `fetch: A -> Promise[P]`:

- a *catalog* for `fetch`

## Operators

### Product

Let:

```
f1: A1 ~> P1
f2: A2 ~> P2
...
fn: An ~> Pn
```

then:

```
product([f1, ... , fn]): [A1, ... , An] ~> [P1, ... , Pn]
```

### Composition

Let:

```
master: A2 ~> P2
ptoa: (P2, A2) -> A1
slave: A1 ~> P1
```

then:

```
compose(master, ptoa, slave): A2 ~> P1
```

### Star

Let:

```
f: A ~> P
```

then:

```
star(f): List[A] ~> List[P]
```

# Cache

## Strategies

Let `CacheValue = Maybe[P] x Maybe[Promise[P]]`, then a *caching strategy* is a function with the following signature:

```
strategy: CacheValue -> boolean
```

### Provided strategies

- `Expire(delay: integer)`
- `available = Expire(Infinity)`
- `refetch = Expire(0)`

## `f`-cache

A `f`-cache is a function with the following signature:

```
cache: A -> CacheValue
```

The actual implementation is a class with the following methods:

- `constructor({ name?: string, map?: Map, atok: (a: A) => string })`
- `get(a): A -> CacheValue`
- `set(a: A, value: CacheValue)`
- `remove(a: A): void`
- `clear(): void`
- `getAvailablePromise(a: A, strategy: Strategy): Maybe[Promise[P]]`
- `getPromise(a: A, strategy: Strategy, fetch: Fetch[A, P]): Promise[P]`
- `storePayload(a: A, p: P, promise: Promise[P])`
- `storePromise(a: A, promise: Promise[P])`

## Optimisations

**fetch**

`fetch: A ~> P`

use

`cacheFetch(fetch, strategy, cache)`

**catalog**

`catalog: S ~> List[P]`

use

`cacheCatalog(catalog, cache, strategy, pcache, ptoa)`

where

```
ptoa: (p: P, s: S, i: Integer) -> A
```

The cache owns an additional method `removeBySingleton(a: A)`.

**star**

`star: List[A] ~> List[P]`

use

`cacheStar(star, strategy, cache, pcache)`

The cache owns an additional method `removeBySingleton(a: A)`.

**fstar**

`f*: List[A] ~> List[P]`

use

```
cacheStar(star(f), strategy, cache, pcache)
// or
f = cacheFetch(f, strategy, pcache)
cacheFetch(star(f), strategy, cache))
```

**product**

`p: (A1, ..., An) ~> (P1, ..., Pn)`

use

```
product(
  cacheFetch(f1, strategy1, cache1),
  ...
  cacheFetch(fn, strategyn, cachen)
)
```

**composition**

```
master: A2 ~> P2
slave: A1 ~> P1
ptoa: (P2, A2) -> A1

c: A2 ~> P1
```

use

```
compose(
  cacheFetch(master, strategy1, cache1),
  ptoa,
  cacheFetch(slave, strategy2, cache2)
)
```
