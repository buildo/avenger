# avenger

[![](https://travis-ci.org/buildo/anorm-extensions.svg)](https://travis-ci.org/buildo/avenger)
[![](https://img.shields.io/npm/v/avenger.svg?sytle=flat-square)](https://www.npmjs.com/package/avenger)
[![npm downloads](https://img.shields.io/npm/dm/avenger.svg?style=flat-square)](https://www.npmjs.com/package/avenger)
[![](https://david-dm.org/buildo/avenger.svg)](https://david-dm.org/buildo/avenger#info=dependencies&view=list)
[![](https://david-dm.org/buildo/avenger/dev-status.svg)](https://david-dm.org/buildo/avenger#info=devDependencies&view=list)

### A word of caution

This is still under heavy development, and this readme refers to a not-yet-published branch

### TLDR

A CQRS-flavoured data fetching and caching layer in JavaScript.

Batching, caching, data-dependecies and manual invalidations in a declarative fashion for node and the browser.

### API layers

Avenger provides 3+ levels of apis:

- **layer 0** `fetch`: provides an abstraction over asyncronous data retrieval (`fetch`) and operators to compose different fetches together (`composition` and `product`). Includes data-dependencies and promise pipelining, and a prescription for api categorization.
- **layer 1** `fcache`: caching layer on top of `fetch`. Caching and batching happens here. This layer can be considered similar to [DataLoader](https://github.com/facebook/dataloader), adding more powerful caching strategies. You'd use this layer directly in a stateless (server-side) environment, where no long-living cache is involved.
- **layer 2** `query`: extends `fcache` with observable queries. On top of this, it provides the CQRS:command channel for mutations and optimistic updates. You'd use this layer in a stateful (client) environment, where the app interacts with a long-living cache of remote/async data.
- **layer** + [react-avenger](https://github.com/buildo/react-avenger): provides helpers to connect an avenger instance to React components in a declarative fashion. You'd use this layer in a generic React client
