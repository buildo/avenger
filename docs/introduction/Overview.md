# Overview

At a quick glance, this is the proposed workflow:

1. declare how to retrieve data using Queries
2. define how Commands mutate data and which Queries are affected by each mutation
3. when your app state[^1] changes:
    - inform avenger about the data you're interested in
    - let it work for you, resolve data dependencies, re-use and update values in cache
    - get aggregated data change events back

[^1] your app state could be anything. If your app uses client side routing, it could just be the current router state. If your app is authenticated, you typically want to add a token or something similar. Read more how we define state for our own apps in [How we use it](HowWeUseIt.html)