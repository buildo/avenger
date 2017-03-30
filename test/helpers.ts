import * as assert from 'assert'
import { CacheValue } from '../src'
import { isSome } from 'fp-ts/lib/Option'

export function assertCacheValueDone<P>(cacheValue: CacheValue<P>, value: P) {
  if (isSome(cacheValue.done)) {
    assert.deepEqual(cacheValue.done.value.value, value)
  } else {
    assert.fail(cacheValue.done, { value }, 'bad CacheValue done.value', 'deepEqual')
  }
}
