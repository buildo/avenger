import t from 'tcomb';
import { ExtractedQueryCaches } from './extractQueryCaches';

export function restoreQueryCaches(graph, data) {
  t.assert(ExtractedQueryCaches.is(data));
  Object.keys(data).forEach(queryName => {
    data[queryName].forEach(({ a, value }) => {
      graph[queryName].fetch.cache.storePayload(a, value, Promise.resolve(value));
    });
  });
}