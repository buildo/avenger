import * as t from 'io-ts'
import { ThrowReporter } from 'io-ts/lib/ThrowReporter'
import { flatGraph } from './util';
import { ExtractedQueryCaches } from './extractQueryCaches';
import debug from 'debug';

const log = debug('avenger:restoreQueryCaches');

export function restoreQueryCaches(_graph, data) {
  ThrowReporter.report(t.validate(data, ExtractedQueryCaches))
  const graph = flatGraph(_graph);
  Object.keys(data).forEach(queryName => {
    const { a, value } = data[queryName];
    log('restoring %s(%o)=%o', queryName, a, value);
    graph[queryName].fetch.cache.storePayload(a, value, Promise.resolve(value));
  });
}
