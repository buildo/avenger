# Motivation

Avenger fits somewhere between a client and a server. It is good at managing complex data fetching in a declarative form, keeping a client cache for data re-use among different consumers.

At a very high level, the api is based on promises and the concepts of `Query` (declaring data fetching) and `Command` (mutating data).

Users who decide to offload a big chunk of state management to avenger should benefit in:
* reducing complexity of their data-fetching layer
* reduce the need for any other cache on their clients
* have a conceptually clear declarative api for retrieving data (possibly asynchronously)

