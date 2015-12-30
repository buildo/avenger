# Overview

```sequence
Title: Avenger workflow
App->Avenger: userQuery + { userId: 42 }
Avenger->userQuery: fetch({ userId: 42 })
userQuery->API: GET /users/42
API->userQuery: { user: { _id: 42, name: John } }
userQuery->Avenger: { user: { _id: 42, name: John } }
Avenger->App: { userQuery: { user: { _id: 42, name: John } } }
```

At a quick glance, this is the proposed workflow:

1. declare how to retrieve data using Queries
2. define how Commands mutate data and which Queries are affected by each mutation
3. when your app state[^1] changes:
    - inform avenger about the data you're interested in
    - let it work for you, resolve data dependencies, re-use and update values in cache
    - get aggregated data change events back

[^1] your app state could be anything. If your app uses client side routing, it could just be the current router state. If your app is authenticated, you typically want to add a token or some other means of authentication. Read more how we define state for our own apps in [How We Use It](HowWeUseIt.html)

### How it compares to...

Spoiler: it doesn't.

##### the fetch() api, or $.ajax

Similarities:
- It makes use of `Promise` to represent asynchronicity in queries

##### Redux

##### [Relay](https://github.com/facebook/relay)

Similarities:
- It is declarative
- Let's you co-locate queries with your UI components when paired with [revenge](https://github.com/buildo/revenge)
- Separates in two different categories Queries and Commands (Mutations) 

Differences:
- Everything else Relay+GraphQL have

##### [React Refetch](https://github.com/heroku/react-refetch)

##### [React Transmit](https://github.com/RickWong/react-transmit)