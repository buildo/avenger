import assert from 'assert'

import {
  Expire,
  refetch,
  available
} from '../../src/cache/strategies'

describe('cache', () => {

  describe('strategies', () => {

    describe('available', () => {

      it('should never expire', () => {
        assert.equal(available.isExpired(-10000000000000000000), false)
      })

      it('should approve a done if available', () => {
        assert.equal(available.isAvailable({}), false)
        assert.equal(available.isAvailable({ done: { value: 2, timestamp: 0, promise: Promise.resolve(2) } }), true)
      })

    })

    describe('refetch', () => {

      it('should always expire', () => {
        assert.equal(refetch.isExpired(new Date().getTime()), true)
        assert.equal(refetch.isExpired(10000000000000000000), false)
      })

      it('should not approve a done even if available', () => {
        assert.equal(refetch.isAvailable({}), false)
        assert.equal(refetch.isAvailable({ done: { value: 2, timestamp: 0, promise: Promise.resolve(2) } }), false)
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
        assert.equal(expire.isAvailable({}), false)
        assert.equal(expire.isAvailable({ done: { value: 2, timestamp: new Date().getTime(), promise: Promise.resolve(2) } }), true)
      })

    })

  })

})
