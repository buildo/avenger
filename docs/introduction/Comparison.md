# How it compares to...

### the fetch() api, or $.ajax

Similarities:
- It makes use of `Promise` to represent asynchronicity in queries

Differences:
- `Promise`s per se have no shared state, cache, results reuse, serializabilty and remote execution support

### [Redux](https://github.com/rackt/redux)

We're listing Redux because it's THE solution for react apps. In fact, there are not many similarities: Redux is great for managing state locally. In real life, the great majority of apps are api-driven, and avenger is born for this: projecting local minimal state to api-generated state, and managing it.
You can do the same with Redux, but we feel you're loosing many of its benefits if your state manipulations need to go through a remote api.

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
- Let's you co-locate queries with your UI components when paired with [revenge](https://github.com/buildo/revenge)

Differences:
- Avenger it's not react-specific (although we use react as well)
- We make no assumption on the origin of the data. It's easy to go to HTTP same as it is to go to localStorage.
- Avenger offers smart reuse of the data your UI needs, and also manages a cache to reuse results later in time. At current status, React Refetch doesn't seem to offer neither of the two.
- Avenger speaks and resolves dependencies. It can reuse results in different points of the dependency chain. Much more powerful than simple `Promise` composition.

### [React Transmit](https://github.com/RickWong/react-transmit)

TODO (react-specific, no cache, no sharing of results among sub trees)

[^1] Work in progress, discussed in [Recipe](../wip/Recipe.md)