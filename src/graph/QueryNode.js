import difference from 'lodash/difference';
import uniq from 'lodash/uniq';
import identity from 'lodash/identity';
import { refetch } from '../cache/strategies';
import { compose, product } from '../fetch/operators';
import { cacheFetch } from '../query/operators';
import { ObservableCache } from '../query/ObservableCache';

const _compound = qObj => {
  const compoundP = qObj[Object.keys(qObj)[0]].compound;
  return qObj[compoundP];
};

export const Query = ({ fetch: _fetch, cacheStrategy = refetch, ...q }) => {
  const compound = q.id;
  const cache = new ObservableCache({ name: compound });
  const fetch = cacheFetch(_fetch, cacheStrategy, cache);
  const upsetParams = {
    ...Object.keys(q.dependencies || {}).reduce((ac, k) => ({
      ...ac, ..._compound(q.dependencies[k].query).upsetParams
    }), {}),
    ...(q.params || {})
  };

  if (!q.dependencies) {
    // atom / no dependencies (can have params)
    //
    // becomes just `cacheFetch(finalFetch)`
    //
    const A = Object.keys(q.params || {});
    return {
      [compound]: { fetch, A, compound, upsetParams }
    };
  } else {
    const paramKeys = Object.keys(q.params || {});
    const depsKeys = Object.keys(q.dependencies);
    const fromAKeys = difference(paramKeys, depsKeys);
    const depsOnly = fromAKeys.length === 0;

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
        fetch: product(depsKeys.map(k => _compound(q.dependencies[k].query).fetch)),
        compound
      };

      const finalFetch = {
        A: depsKeys,
        fetch,
        compound
      };

      const map = ps => depsKeys.reduce((ac, k, i) => ({
        ...ac,
        [k]: (q.dependencies[k].map || identity)(ps[i])
      }), {});
      const compoundRoot = {
        fetch: compose(depsProduct.fetch, map, finalFetch.fetch),
        compound,
        upsetParams
      };

      return {
        [`${compound}_depsProduct`]: depsProduct,
        [`${compound}_finalFetch`]: finalFetch,
        [compound]: compoundRoot
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

      const cache = new ObservableCache({ name: `${compound}_syncFetchA` });
      const syncFetchAFetch = cacheFetch(aas => Promise.resolve(fromAKeys.map(pk => aas[pk])), refetch, cache);
      const syncFetchA = {
        A: fromAKeys,
        fetch: syncFetchAFetch,
        compound
      };

      const depsAndA = {
        fetch: product([syncFetchA.fetch].concat(depsKeys.map(k => _compound(q.dependencies[k].query).fetch))),
        compound
      };

      const finalFetch = {
        A: uniq(paramKeys.concat(depsKeys)),
        fetch,
        compound
      };

      const compoundRoot = {
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
        compound,
        upsetParams
      };

      return {
        [`${compound}_syncFetchA`]: syncFetchA,
        [`${compound}_depsAndA`]: depsAndA,
        [`${compound}_finalFetch`]: finalFetch,
        [compound]: compoundRoot
      };
    }
  }
};
