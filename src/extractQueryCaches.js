import * as t from 'io-ts';
import { querySync } from './query/query';
import { distributeParams } from './util';

const ExtractedQueryCache = t.strict({
  a: t.object,
  value: t.any
});

// In this type, as well as in the `extractQueryCaches` function below,
// we heavily rely on the internals of a `QueryNode`.
// Consider moving (part of) this code into the QueryNode logic
const ExtractedNodeCache = t.strict({
  fetch: t.union([ExtractedQueryCache, t.undefined]),
  finalFetch: t.union([ExtractedQueryCache, t.undefined]),
  syncFetchA: t.union([ExtractedQueryCache, t.undefined])
});

export const ExtractedQueryCaches = t.dictionary(
  t.string, ExtractedNodeCache
);

export function extractQueryCaches(queryNodes, flatParams) {
  const params = distributeParams(queryNodes, flatParams);
  return Object.keys(queryNodes).reduce((extracted, P) => {
    const node = queryNodes[P];
    const a = params[P];
    const caches = {};
    if (!node.childNodes) {
      // if it's the leaf/atom case of QueryNode..
      const value = querySync(node.fetch, a).data
      if (typeof value !== 'undefined') {
        caches.fetch = { a, value };
      }
    } else {
      // if it's not, `finalFetch` is there for sure
      const childNodes = node.childNodes;
      const { master, ptoa } = node.fetch;
      const masterValue = querySync(master, a);
      // and we know its master will always be a product
      if (masterValue.every(xi => xi.hasOwnProperty('data'))) {
        const data = masterValue.map(xi => xi.data);
        const a1 = ptoa(data, a);
        const value = querySync(childNodes.finalFetch.fetch, a1).data;
        if (typeof value !== 'undefined') {
          caches.finalFetch = { a: a1, value };
        }
      }
      // it may have also a `syncFetchA` (third case of `QueryNode`)
      if (childNodes.syncFetchA) {
        const a2 = a[0];
        const a3 = t.Array.is(a2) ? a2[a2.length - 1] : a2;
        const value = querySync(childNodes.syncFetchA.fetch, a3).data;
        if (typeof value !== 'undefined') {
          caches.syncFetchA = { a: a3, value };
        }
      }
    }

    if (Object.keys(caches).length > 0) {
      return {
        ...extracted,
        [P]: caches
      };
    } else {
      return extracted;
    }
  }, {});
}
