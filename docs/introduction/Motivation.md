# Motivation

Avenger is good at managing complex data fetching in a declarative form, keeping a client cache for data re-use among different consumers.

At a very high level, the api is based on promises and the concepts of `Query` (declaring data fetching) and `Command` (mutating data).

Users who decide to offload a big chunk of state management to avenger should benefit in:
* reducing complexity of their data-fetching layer
* reduce the need for any other cache on their clients
* have a conceptually clear declarative api for retrieving data, possibly in an asynchronous way
 

### Y U NO Relay+GraphQL?

First, we have a lot of tested and production ready apis. Although there's a clear path to simply wrap those behind a GraphQL endpoint, it can be a lot of additional effort to swap it in. Also, GraphQL and Relay are authentication and authorization agnostic...

**TODO**


In addition, using avenger we can easily encode local queries to the client device, or localStorage or anything else. Although there are efforts in this direction (see e.g. [relay-composite-layer](https://github.com/eyston/relay-composite-network-layer)), it's hard to do so with Relay+GraphQL.

