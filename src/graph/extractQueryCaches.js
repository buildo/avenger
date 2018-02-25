import * as t from 'io-ts';
import flatten from 'lodash/flatten';
import findKey from 'lodash/findKey';
import { querySync } from '../query/query';
import { distributeParams, flattenQueries } from './util';

const ExtractedQueryCache = t.strict({
  a: t.object,
  value: t.any
});
export const ExtractedQueryCaches = t.dictionary(
  t.string, ExtractedQueryCache
);

function extractQueryCache(flatQueryNodes, fetch, a) {
  if (fetch.type === 'product') {
    return flatten(
      fetch.fetches.map((f, i) =>
        extractQueryCache(flatQueryNodes, f, a[i])
      )
    );
  }

  if (fetch.type === 'composition') {
    const { master, slave, ptoa } = fetch;
    const masterValue = querySync(master, a);
    const isProduct = ( master.type === 'product' );
    const ok = isProduct ?
      masterValue.every(xi => xi.hasOwnProperty('data')) : masterValue.hasOwnProperty('data');
    if (ok) {
      const data = isProduct ? masterValue.map(xi => xi.data) : masterValue.data;
      const a1 = ptoa(data, a);
      return [
        ...extractQueryCache(flatQueryNodes, master, a),
        ...extractQueryCache(flatQueryNodes, slave, a1)
      ];
    } else {
      return [];
    }
  }

  const P = findKey(flatQueryNodes, { fetch });
  return [{ P, a, value: querySync(fetch, a).data }];
}

export function extractQueryCaches(queryNodes, flatParams) {
  const caches = {};
  const flatQueryNodes = flattenQueries(queryNodes);
  const args = distributeParams(flatQueryNodes, flatParams);
  Object.keys(flatQueryNodes).forEach(P => {
    const qc = extractQueryCache(flatQueryNodes, flatQueryNodes[P].fetch, args[P]);
    qc.filter(
      ({ value }) => typeof value !== 'undefined'
    ).forEach(({ P: p, a, value }) => {
      caches[p] = { a, value };
    });
  });
  return caches;
}
