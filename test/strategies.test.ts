import * as assert from 'assert'

import { none, some } from 'fp-ts/lib/Option'
import {
  Expire,
  refetch,
  available,
  CacheValue,
  Done
} from '../src'

describe('strategies', () => {

  describe('available', () => {

    it('should never expire', () => {
      assert.equal(available.isExpired(-10000000000000000000), false)
    })

    it('should approve a done if available', () => {
      assert.equal(available.isAvailable(new CacheValue(none, none)), false)
      assert.equal(available.isAvailable(new CacheValue(some(new Done(2, 0, Promise.resolve(2))), none)), true)
    })

  })

  describe('refetch', () => {

    it('should always expire', () => {
      assert.equal(refetch.isExpired(new Date().getTime()), true)
      assert.equal(refetch.isExpired(10000000000000000000), false)
    })

    it('should not approve a done even if available', () => {
      assert.equal(refetch.isAvailable(new CacheValue(none, none)), false)
      assert.equal(refetch.isAvailable(new CacheValue(some(new Done(2, 0, Promise.resolve(2))), none)), false)
    })

  })

  describe('Expire', () => {

    const expire = new Expire(1000)

    it('should expire', () => {
      assert.equal(expire.isExpired(new Date().getTime() - 999), false)
      assert.equal(expire.isExpired(new Date().getTime() - 1000), true)
      assert.equal(expire.isExpired(new Date().getTime() - 1001), true)
    })

    it('should approve a done if available', () => {
      assert.equal(expire.isAvailable(new CacheValue(none, none)), false)
      assert.equal(expire.isAvailable(new CacheValue(some(new Done(2, Date.now(), Promise.resolve(2))), none)), true)
    })

  })

})
