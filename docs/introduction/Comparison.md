# How it compares to...

### the fetch() api, or $.ajax

Similarities:
- It makes use of `Promise` to represent asynchronicity in queries

Differences:
- `Promise`s per se have no shared state, cache, results reuse, serializabilty and remote execution support

### [Redux](https://github.com/rackt/redux)

### [Relay](https://github.com/facebook/relay)

Similarities:
- It is declarative
- Let's you co-locate queries with your UI components when paired with [revenge](https://github.com/buildo/revenge)
- Separates in two different categories Queries and Commands (Mutations)
- Supports serialization and remote execution[^1], similarly to how Relay compacts different query into a single GraphQL endpoint query.

Differences:
- Avenger maps easily 1:1 to a "standard" REST and/or json api
- Everything else Relay+GraphQL have and Avenger does not

### [React Refetch](https://github.com/heroku/react-refetch)

Similarities:
- Avenger let's you co-locate queries with your UI components when paired with [revenge](https://github.com/buildo/revenge)

Differences:
- Avenger it's not react-specific (although we use react as well)
- We make no assumption on the origin of the data. It's easy to go to HTTP same as it is to go to localStorage.
- Avenger offers smart reuse of the data your UI needs, and also manages a cache to reuse results later in time. At current status, React Refetch doesn't seem to offer neither of the two.
- Avenger speaks and resolves dependencies. It can reuse results in different points of the dependency chain. Much more powerful than simple `Promise` composition.

### [React Transmit](https://github.com/RickWong/react-transmit)

[^1] Work in progress, discussed in [Recipe](../wip/Recipe.md)