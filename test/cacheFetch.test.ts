import * as assert from 'assert'

import {
  cacheFetch,
  Cache,
  available
} from '../src'

describe('cacheFetch', () => {

  it('should return a fetch', () => {
    const fetch = (a: number) => Promise.resolve(2 * a)
    const c = new Cache()
    const cf = cacheFetch(fetch, available, c)
    assert.strictEqual(typeof cf, 'function')
  })

})


/*
describe('cacheCatalog', () => {

  const catalog = () => Promise.resolve([1, 2, 3].map(a => 2 * a))

  it('should return a fetch', () => {
    const c = new Cache<Array<number>, Array<number>>()
    const pcache = new Cache<number, number>()
    const cc = cacheCatalog<number, number>(catalog, available, c, pcache, (p: number) => p / 2)
    assert.strictEqual(typeof cc, 'function')
  })

  it('should fill the cache', () => {
    const c = new Cache<Array<number>, Array<number>>()
    const pcache = new Cache<number, number>()
    const cc = cacheCatalog(catalog, available, c, pcache, (p: number) => p / 2)
    cc([1, 2, 3]).then(ps => {
      // controllo il payload
      assert.deepEqual(ps, [2, 4, 6])
      // controllo la cache
      assert.deepEqual(c.get([1]).done, { value: 2 })
      assert.deepEqual(c.get([2]).done, { value: 4 })
      assert.deepEqual(c.get([3]).done, { value: 6 })
    })
  })

})

describe('cacheStar', () => {

  const star = (as: Array<number>) => Promise.resolve(as.map(a => 2 * a))

  it('should return a fetch', () => {
    const c = new Cache<Array<number>, Array<number>>()
    const pcache = new Cache<number, number>()
    const cs = cacheStar(star, available, c, pcache)
    assert.strictEqual(typeof cs, 'function')
  })

  it('should fill the cache', () => {
    const sinonStar = sinon.spy(star)
    const c = new Cache<Array<number>, Array<number>>()
    const pcache = new Cache<number, number>()
    const cs = cacheStar(sinonStar, available, c, pcache)
    cs([1, 2, 3]).then(ps => {
      // controllo il payload
      assert.deepEqual(ps, [2, 4, 6])
      // controllo che la star sia stata chiamata
      assert.strictEqual(sinonStar.callCount, 1)
      // controllo le cache
      assertCacheValueDone(c.get([1, 2, 3]), [2, 4, 6])
      assertCacheValueDone(pcache.get(1), 2)
      assertCacheValueDone(pcache.get(2), 4)
      assertCacheValueDone(pcache.get(3), 6)
    })
  })

  it('should optimise the input', () => {
    const sinonStar = sinon.spy(star)
    const c = new Cache<Array<number>, Array<number>>()
    const pcache = new Cache<number, number>()
    const cs = cacheStar(sinonStar, available, c, pcache)
    pcache.set(1, { done: { value: 2, timestamp: 0, promise: Promise.resolve(2) } })
    return cs([1, 2, 3]).then(ps => {
      assert.deepEqual(ps, [2, 4, 6])
      // controllo che la star sia stata chiamata con l'input ottimizzato
      assert.strictEqual(sinonStar.callCount, 1)
      assert.deepEqual(sinonStar.firstCall.args, [[2, 3]])
      // controllo le cache
      assertCacheValueDone(c.get([1, 2, 3]), [2, 4, 6])
      assertCacheValueDone(pcache.get(1), 2)
      assertCacheValueDone(pcache.get(2), 4)
      assertCacheValueDone(pcache.get(3), 6)
    })
  })

  it('should not call the star if the input is fully optimised', () => {
    const sinonStar = sinon.spy(star)
    const c = new Cache<Array<number>, Array<number>>()
    const pcache = new Cache<number, number>()
    const cs = cacheStar(sinonStar, available, c, pcache)
    pcache.set(1, { done: { value: 2, timestamp: 0, promise: Promise.resolve(2) } })
    pcache.set(2, { done: { value: 4, timestamp: 0, promise: Promise.resolve(4) } })
    pcache.set(3, { done: { value: 6, timestamp: 0, promise: Promise.resolve(6) } })
    return cs([1, 2, 3]).then(ps => {
      // controllo il payload
      assert.deepEqual(ps, [2, 4, 6])
      // controllo che la star sia stata chiamata con l'input ottimizzato
      assert.strictEqual(sinonStar.callCount, 0)
      // controllo le cache
      assertCacheValueDone(c.get([1, 2, 3]), [2, 4, 6])
      assertCacheValueDone(pcache.get(1), 2)
      assertCacheValueDone(pcache.get(2), 4)
      assertCacheValueDone(pcache.get(3), 6)
    })
  })

  it('should not call the star after a double fetch', () => {
    const sinonStar = sinon.spy(star)
    const c = new Cache<Array<number>, Array<number>>()
    const pcache = new Cache<number, number>()
    const cs = cacheStar(sinonStar, available, c, pcache)
    cs([1, 2, 3])
    return cs([1, 2, 3]).then(() => {
      assert.strictEqual(sinonStar.callCount, 1)
    })
  })

})
*/
