# Avenger

Avenger is (internally) a stateful beast. The point is exactly to relegate tedious state-keeping work inside the avenger box:

- describe the desired data with [`Query`](Queries.html)s
- describe what data a mutation affects using [`Command`](Commands.html)s
- notify avenger when your application state changes (e.g: after the transition to a new route of your web app)
- listen for updates about the data as soon as it is (even partially) available

To do this avenger needs to be aware of the query universe (static), the current query declaration (data the user needs) and the current state, at any point in time.

**NOTE**
> This just an overview of the `Avenger` interface. For a more in-depth discussion you can read the [API Reference](../api/Avenger.html).

You should provide the static information about the query universe creating a new instance:

```js
const avenger = new Avenger(universe)
```

`universe` is a set of [queries](../api/Query.html).
You'll typically have a single instance when running a client side app, or multiple instances when stateless / server side (one per request, created and destroyed).

In order to consume updates about the data, an avenger instance offers an event emitter interface:

```js
avenger.on('change', data => { /* do stuff with data, e.g: re-render */ });
```

From this point on, you should notify avenger when your data needs change, and wait for updates. The main method is `run` that should be invoked passing the query declaration and the current query-relevant state:

```js
av.run(querySet, state);
```

The `querySet` should be a subset of the query universe.

`state` is any object containing all the data you need to execute your queries: it just needs to be an object, it's up to you to decide what exact shape it should have.

For instance, in a web based client app with routing, your entire state could just be the current router state (path params, query params, ...)

At every `querySet`/`state` change, avenger will take care of collecting dependencies and execute the query set, respecting the correct order and each query caching policy (see more in [Caching](Caching.html)).