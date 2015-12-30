# Dependencies

The bread and butter of avenger is solving query dependencies.
A query is dependent on another when it needs data from the first query before being able to execute.

For example, consider the set of queries `{ A, B, C, D }`.
Here's a diagram describing the dependencies among them:

```

    A      D
  /   \    |
 B     C   E
```

In plain English:

- `A` and `D` don't have any dependency
- both `B` and `C` depend on `A`  
- `E` depends on `D`

Given this query set, `A` and `D` can execute right away, in parallel; once `A` is done, `B` and `C` can then start in parallel; in the same way `E` can execute once `D` has completed.

This example is trivial, but in real life reasoning about the correct (and most efficient) execution order can quickly become daunting.

Avenger allows you to express data dependencies among queries in a **declarative** fashion, taking care of the actual query execution. 

Let's now see how a `Dependency` is defined in avenger:

```js
const Dependency = t.struct({
  query: t.Any,
  map: t.Function, 
  multi: t.maybe(t.union([t.Boolean, t.Function]))
}, 'Dependency');
```

**NOTE**
> This just an overview of the `Dependency` interface. For a more in-depth discussion you can read the [API Reference](../api/Dependency.html)

The most important part of a `Dependency` is the `query`. As you have guessed, this is the query to depend on.

`map` allows you to manipulate the result of `query` before this is fed passed along as parameter. For example, you may have a query `B` that needs the user name of the current user. If you have the query `A` that returns the user, you can "extract" the user name from `A` in the dependency definition. Here's the complete example:

```js
const A = Query({
  id: 'A',
  cache: 'optimistic',
  fetch: () => () => return fetch('/users/me').then(r => r.json());
});

const B = Query({
  id: 'B',
  cache: 'optimistic',
  dependencies: {
    name: {
      query: A,
      map: ({ user }) => user.username
    }
  },
  fetch: () => ({ name }) => { ... };
});
```

The `dependencies` of a `Query` is an object:

- its keys are the names of the parameters the query needs as an input for its `fetch` method (usually referred to as `depParameters`).
- its values are the dependencies that allow retrieving such parameters.

In the example, we're defining one parameter called `name`. The value of `name` is obtained by executing `A` and then applying the `map` function on its result.

To summarize, this is the final execution flow when you ask for the result of `B`:

```js
          fetch (A)  // GET /users/me
             |
             |
{ user: { username: 'John' } }
             |
             |
            map // extract name
             |
             |
      { name: 'John' }
             |
             |
          fetch (B)
```