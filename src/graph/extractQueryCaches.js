import t from 'tcomb';
import { querySync } from '../query/query';
import { queriesAndArgs, findP } from './util';

const ExtractedQueryCache = t.interface({
  a: t.Object,
  value: t.Any
}, { strict: true, name: 'ExtractedQueryCache' });
export const ExtractedQueryCaches = t.dict(
  t.String, t.list(ExtractedQueryCache), 'ExtractedQueryCaches'
);

function extractQueryCache(graph, fetch, a) {
  if (fetch.type === 'product') {
    return fetch.fetches.map((fetch, i) =>
      extractQueryCache(graph, fetch, a[i])
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
        ...extractQueryCache(graph, master, a),
        ...extractQueryCache(graph, slave, a1)
      ];
    } else {
      return [];
    }
  }

  const P = findP(graph, fetch);
  return [{ P, a, value: querySync(fetch, a).data }];
}

export function extractQueryCaches(graph, Ps, A) {
  const { args } = queriesAndArgs(graph, Ps, A);
  const caches = {};
  Ps.forEach(P => {
    const qc = extractQueryCache(graph, graph[P].fetch, args[P]);
    qc.filter(
      ({ value }) => typeof value !== 'undefined'
    ).forEach(({ P, a, value }) => {
      if (!caches[P]) {
        caches[P] = [];
      }
      caches[P].push({ a, value });
    });
  });
  return ExtractedQueryCaches(caches);
}
