import * as t from 'io-ts'
import { ThrowReporter } from 'io-ts/lib/ThrowReporter'
import { flattenQueries } from './util';
import { ExtractedQueryCaches } from './extractQueryCaches';
import debug from 'debug';

const log = debug('avenger:restoreQueryCaches');

export function restoreQueryCaches(queryNodes, data) {
  ThrowReporter.report(t.validate(data, ExtractedQueryCaches))
  const flatQueryNodes = flattenQueries(queryNodes);
  Object.keys(data).forEach(queryName => {
    const { a, value } = data[queryName];
    log('restoring %s(%o)=%o', queryName, a, value);
    flatQueryNodes[queryName].fetch.cache.storePayload(a, value, Promise.resolve(value));
  });
}
