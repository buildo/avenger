# Commands

`Command`s are, in avenger’s jargon, the way applications express mutations. In a [CQRS](http://martinfowler.com/bliki/CQRS.html) world, commands


> change the state of a system but do not return a value


Avenger’s commands are in fact made of two separate parts: the action itself — a (possibly) asynchronous function performing a mutation — and a description of queries that must be invalidated after that action completes successfully:


```js
export const Command = t.struct({
  // an optional list of queries to invalidate
  // entire downset for these will be invalidated as well
  invalidates: t.maybe(AvengerInput),
    
  // actual command
  run: t.Function // state: t.Object -> Promise[t.Any]
}, 'Command');
```

A `Command` can be easily mapped to a `POST` or `PUT` method in a REST api, as well as to a synchronous action as e.g. in `localStorage.set(key, value)`.

In any case, they shouldn't return any meaningful value, except for a way to track (successful) completion: this is why the `run` function should return a `Promise`.