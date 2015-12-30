# How it compares to...

### the fetch() api, or $.ajax

Similarities:
- It makes use of `Promise` to represent asynchronicity in queries

### Redux

### [Relay](https://github.com/facebook/relay)

Similarities:
- It is declarative
- Let's you co-locate queries with your UI components when paired with [revenge](https://github.com/buildo/revenge)
- Separates in two different categories Queries and Commands (Mutations) 

Differences:
- Everything else Relay+GraphQL have

### [React Refetch](https://github.com/heroku/react-refetch)

Similarities:
- Avenger let's you co-locate queries with your UI components when paired with [revenge](https://github.com/buildo/revenge)

Differences:
- Avenger it's not react-specific (although we use react as well)
- We make no assumption on the origin of the data. It's easy to go to HTTP same as it is to go to localStorage.
- Avenger offers smart reuse of the data your UI needs, and also manages a cache to reuse results later in time. At current status, React Refetch doesn't seem to offer neither of the two.

### [React Transmit](https://github.com/RickWong/react-transmit)