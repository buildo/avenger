import * as assert from 'assert'
import { CacheValue } from '../src/cache/strategies'

export function assertCacheValueDone<P>(cacheValue: CacheValue<P>, value: P) {
  if (cacheValue.done) {
    assert.deepEqual(cacheValue.done.value, value)
  } else {
    assert.fail(cacheValue.done, { value }, 'bad CacheValue done.value', 'deepEqual')
  }
}
