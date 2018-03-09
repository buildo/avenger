import * as t from 'io-ts'
import { ThrowReporter } from 'io-ts/lib/ThrowReporter'
import { ExtractedQueryCaches } from './extractQueryCaches';
import debug from 'debug';

const log = debug('avenger:restoreQueryCaches');

export function restoreQueryCaches(queryNodes, data) {
  ThrowReporter.report(t.validate(data, ExtractedQueryCaches))
  Object.keys(data).forEach(P => {
    Object.keys(data[P]).forEach(fk => {
      const { a, value } = data[P][fk];
      const fetch = fk === 'fetch' ? queryNodes[P].fetch : queryNodes[P].childNodes[fk].fetch;
      log('restoring %s(%o)=%o', P, a, value);
      fetch.cache.storePayload(a, value, Promise.resolve(value));
    });
  });
}
