import * as assert from 'assert'
import * as sinon from 'sinon'
import { assertCacheValueDone } from './helpers'

import {
  Cache,
  Expire,
  refetch,
  available
} from '../src'

const expire = new Expire(1000)

describe('Cache', () => {

  describe('getAvailablePromise', () => {

    it('should return undefined if there is no available promise', () => {
      const cache = new Cache()
      assert.strictEqual(cache.getAvailablePromise(1, available), undefined)
      assert.strictEqual(cache.getAvailablePromise(1, refetch), undefined)
      assert.strictEqual(cache.getAvailablePromise(1, expire), undefined)

      cache.set(1, { done: { value: 2, timestamp: 0, promise: Promise.resolve(2) } })
      assert.strictEqual(cache.getAvailablePromise(1, refetch), undefined)
      assert.strictEqual(cache.getAvailablePromise(1, expire), undefined)
    })

    it('should return done.promise if there is an available done', () => {
      const cache = new Cache()
      const done = { value: 2, timestamp: 0, promise: Promise.resolve(2) }
      const blocked = Promise.resolve(2)
      cache.set(1, { done })
      assert.strictEqual(cache.getAvailablePromise(1, available), done.promise)
      cache.set(1, { done, blocked })
      assert.strictEqual(cache.getAvailablePromise(1, available), done.promise)
    })

    it('should return blocked if there is an available blocked', () => {
      const cache = new Cache()
      const blocked = Promise.resolve(2)
      cache.set(1, { blocked })
      assert.strictEqual(cache.getAvailablePromise(1, available), blocked)
      assert.strictEqual(cache.getAvailablePromise(1, refetch), blocked)
      assert.strictEqual(cache.getAvailablePromise(1, expire), blocked)
    })

  })

  describe('getPromise', () => {

    it('should fetch when a cache miss occours', () => {
      const fetch = sinon.spy((a: number) => Promise.resolve(2 * a))
      const cache = new Cache()
      return cache.getPromise(1, available, fetch).then(p => {
        assert.strictEqual(p, 2)
        assert.strictEqual(fetch.callCount, 1)
        assertCacheValueDone(cache.get(1), 2)
      })
    })

    it('should fetch when there is no available promise (refetch)', () => {
      const fetch = sinon.spy((a: number) => Promise.resolve(2 * a))
      const cache = new Cache()
      const done = { value: 2, timestamp: 0, promise: Promise.resolve(2) }
      cache.set(1, { done })
      return cache.getPromise(1, refetch, fetch).then(p => {
        assert.strictEqual(p, 2)
        assert.strictEqual(fetch.callCount, 1)
        assertCacheValueDone(cache.get(1), 2)
      })
    })

    it('should fetch when there is no available promise (expire)', () => {
      const fetch = sinon.spy((a: number) => Promise.resolve(2 * a))
      const cache = new Cache()
      const done = { value: 2, timestamp: 0, promise: Promise.resolve(2) }
      cache.set(1, { done })
      return cache.getPromise(1, expire, fetch).then(p => {
        assert.strictEqual(p, 2)
        assert.strictEqual(fetch.callCount, 1)
        assertCacheValueDone(cache.get(1), 2)
      })
    })

    it('should not fetch when a cache hit occours (done)', () => {
      const fetch = sinon.spy((a: number) => Promise.resolve(2 * a))
      const cache = new Cache()
      const done = { value: 2, timestamp: 0, promise: Promise.resolve(2) }
      cache.set(1, { done })
      return cache.getPromise(1, available, fetch).then(p => {
        assert.strictEqual(p, 2)
        assert.strictEqual(fetch.callCount, 0)
      })
    })

    it('should not fetch when a cache hit occours (blocked)', () => {
      const fetch = sinon.spy((a: number) => Promise.resolve(2 * a))
      const cache = new Cache()
      const blocked = Promise.resolve(2)
      cache.set(1, { blocked })
      return cache.getPromise(1, available, fetch).then(p => {
        assert.strictEqual(p, 2)
        assert.strictEqual(fetch.callCount, 0)
      })
    })

  })

})
