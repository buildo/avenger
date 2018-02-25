import difference from 'lodash/difference';
import uniq from 'lodash/uniq';
import identity from 'lodash/identity';
import { refetch } from '../cache/strategies';
import { compose, product } from '../fetch/operators';
import { cacheFetch } from '../query/operators';
import { ObservableCache } from '../query/ObservableCache';

export const Query = ({ fetch: _fetch, cacheStrategy = refetch, id, ...q }) => {
  if (!q.dependencies) {
    // atom / no dependencies (can have params)
    //
    // becomes just `cacheFetch(finalFetch)`
    //
    const A = Object.keys(q.params || {});
    const cache = new ObservableCache({ name: id });
    const fetch = cacheFetch(_fetch, cacheStrategy, cache);
    const depth = 0;
    return {
      fetch, A, depth
    };
  } else {
    const paramKeys = Object.keys(q.params || {});
    const depsKeys = Object.keys(q.dependencies);
    const fromAKeys = difference(paramKeys, depsKeys);
    const depsOnly = fromAKeys.length === 0;

    const cache = new ObservableCache({ name: id });
    const fetch = cacheFetch(_fetch, cacheStrategy, cache);
    const depth = Math.max(...depsKeys.map(k => q.dependencies[k].query.depth)) + 1;

    if (depsOnly) {
      // a query with dependencies only (no params)
      // is translated to:
      //
      //         compose
      //       /    |   \
      //   product  map  finalFetch
      //   /      \
      // dep1  [... depN]
      //
      // where just `finalFetch` should be cached
      //

      const depsProduct = {
        A: depsKeys.map(k => q.dependencies[k].query.A),
        fetch: product(depsKeys.map(k => q.dependencies[k].query.fetch))
      };

      const finalFetch = {
        A: depsKeys,
        fetch
      };

      const map = ps => depsKeys.reduce((ac, k, i) => ({
        ...ac,
        [k]: (q.dependencies[k].map || identity)(ps[i])
      }), {});

      return {
        A: depsProduct.A,
        fetch: compose(depsProduct.fetch, map, finalFetch.fetch),
        depth,
        childNodes: {
          [`${id}_depsProduct`]: depsProduct,
          [`${id}_finalFetch`]: finalFetch
        }
      };
    } else {
      // a query with both dependencies
      // and params is translated to:
      //
      //            ___compose_
      //           /      |    \
      //    _product____  map  finalFetch
      //   /   |        \
      // dep1 [...depN] syncFetchA
      //
      // again, only `finalFetch` should be cached,
      // but being `syncFetchA` a "leaf" itself, we have to cache it as well,
      // otherwise it would not be "observable" (no subject available)
      //

      const cache = new ObservableCache({ name: `${id}_syncFetchA` });
      const syncFetchAFetch = cacheFetch(aas => Promise.resolve(fromAKeys.map(pk => aas[pk])), refetch, cache);
      const syncFetchA = {
        A: fromAKeys,
        fetch: syncFetchAFetch
      };

      const depsAndA = {
        A: [syncFetchA.A].concat(depsKeys.map(k => q.dependencies[k].query.A)),
        fetch: product([syncFetchA.fetch].concat(depsKeys.map(k => q.dependencies[k].query.fetch)))
      };

      const finalFetch = {
        A: uniq(paramKeys.concat(depsKeys)),
        fetch
      };

      return {
        A: depsAndA.A,
        fetch: compose(
          depsAndA.fetch,
          ([syncFetchAPs, ...prodPs]) => ({
            ...prodPs.reduce((ac, p, i) => ({
              ...ac, [depsKeys[i]]: (q.dependencies[depsKeys[i]].map || identity)(p)
            }), {}),
            ...syncFetchAPs.reduce((ac, p, i) => ({
              ...ac, [fromAKeys[i]]: p
            }), {})
          }),
          finalFetch.fetch
        ),
        depth,
        childNodes: {
          [`${id}_syncFetchA`]: syncFetchA,
          [`${id}_depsAndA`]: depsAndA,
          [`${id}_finalFetch`]: finalFetch
        }
      };
    }
  }
};
