# avenger

[![](https://travis-ci.org/buildo/avenger.svg)](https://travis-ci.org/buildo/avenger)
[![](https://img.shields.io/npm/v/avenger.svg?sytle=flat-square)](https://www.npmjs.com/package/avenger)
[![npm downloads](https://img.shields.io/npm/dm/avenger.svg?style=flat-square)](https://www.npmjs.com/package/avenger)
[![](https://david-dm.org/buildo/avenger.svg)](https://david-dm.org/buildo/avenger#info=dependencies&view=list)
[![](https://david-dm.org/buildo/avenger/dev-status.svg)](https://david-dm.org/buildo/avenger#info=devDependencies&view=list)
___

Avenger is a data fetching and caching layer written in TypeScript.

It was born from the need for a software that implemented the principle of **Command Query Responsibility Segregation** without necessarily enforcing it. If you are new to the concept you can get a grasp of its foundations in [this nice aricle](https://martinfowler.com/bliki/CQRS.html) by Martin Fowler. Using his words:

*"The change that CQRS introduces is to split that conceptual model into separate models for update and display, which it refers to as Command and Query respectively following the vocabulary of CommandQuerySeparation. The rationale is that for many problems, particularly in more complicated domains, having the same conceptual model for commands and queries leads to a more complex model that does neither well."*

at the heart of the DSL of the software there are two constructors: **query** and **command**.

#query
the **`query`** constructor allows you to query your data source and get an object of type [**`CachedQuery`**](#CachedQuery) in return. it accepts two parameters, the first is a function with a [**`Fetch`**](#Fetch) signature and is used to retrive data from your data source, the second is a function with [**`StrategyBuilder`**](#StrategyBuilder) signature:
```ts
// in this snippet a very straightforward query to get a User is implemented

type Error = "there was an error"
type User = { userName: String }

const fetchFunction: (userId: number) => TaskEither<Error, User> = (userId) => {
  return taskEither.fromEither(right(getUser(userId)))
}

const myQuery: ObservableQuery<number, Error, User> = query(fetchFunction, refetch)

declare function dispatchError(e: Error) : void
declare function setCurrentUser(e: User) : void

// calling `run` on your query will return a TaskEither<Error, User>
myQuery.run(1).fold(dispatchError, setCurrentUser)

```

**Avenger** offers some default `StrategyBuilder` implementations:

- **refetch:** runs the fetch function everytime the data is requested.
- **expire:** when the data is requested, the fetch function is run only if data is older than the expiration defined, otherwise the cached value is used.
- **available:** when the data is requested, if a cahed value is available it is always returned, otherwise the fetch function is run.


Each time the fetch funcion is run with some inputs, those same inputs are used as a key to store the result, from then on when avenger needs to decide if a valid version of the data is already stored in our cache it  will look for the particular combination of inputs used used for the fetch function into the Cache, match it against the selected cache strategy and then run the fetch function or return the cached value accordingly.

The default behaviour is to check the equality of inputs via a shallow equality check, but there are also helpers for a stricter check: `queryStrict` will require the inputs to be the same object in memory and `queryJSON` will run the checks against a serialized version of the inputs using JSON stringification.

the

#observing queries
observe

#composing queries
compose, product

#command
a command is a command

#React

#CachedQuery

#Fetch
returns a `TaskEither` from [`fp-ts`](https://github.com/gcanti/fp-ts)

#StrategyBuilder
