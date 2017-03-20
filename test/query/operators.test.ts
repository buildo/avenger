// import * as assert from 'assert'
// import * as sinon from 'sinon'
// import { assertCacheValueDone } from '../helpers'

// import {
//   Cached,
//   cacheCatalog,
//   cacheStar
// } from '../../src/query/operators'
// import { ObservableCache } from '../../src/query/ObservableCache'
// import { available } from '../../src/cache/strategies'
// import { Cache } from '../../src/cache/Cache'

// function spy<A, P>(f: Cached<A, P>): Cached<A, P> & sinon.SinonSpy {
//   return sinon.spy(f) as any
// }

// describe('query/operators', () => {

//   describe('cacheCatalog', () => {

//     const catalog = () => Promise.resolve([1, 2, 3].map(a => 2 * a))

//     it('should return a fetch', () => {
//       const pcache = new ObservableCache<number, number>()
//       const cachedcatalog = cacheCatalog(catalog, available, pcache, (p) => p / 2)
//       assert.strictEqual(typeof cachedcatalog, 'function')
//     })

//     it('should fill the cache', () => {
//       const pcache = new ObservableCache<number, number>()
//       const cachedcatalog = cacheCatalog(catalog, available, pcache, (p) => p / 2)
//       return cachedcatalog([1, 2, 3]).then(ps => {
//         // controllo il payload
//         assert.deepEqual(ps, [2, 4, 6])
//       })
//     })

//   })

//   describe('cacheStar', () => {

//     const star = (as: Array<number>) => Promise.resolve(as.map(a => 2 * a))

//     it('should return a fetch', () => {
//       const pcache = new Cache()
//       const cs = cacheStar(star, available, pcache)
//       assert.strictEqual(typeof cs, 'function')
//     })

//     it('should fill the cache', () => {
//       const pcache = new Cache<number, number>()
//       const cs = spy(cacheStar<number, number>(star, available, pcache))
//       return cs([1, 2, 3]).then(ps => {
//         // controllo il payload
//         assert.deepEqual(ps, [2, 4, 6])
//         // controllo che la star sia stata chiamata
//         assert.strictEqual(cs.callCount, 1)
//         // controllo le cache
//         assertCacheValueDone(cs.cache.get([1, 2, 3]), [2, 4, 6])
//         assertCacheValueDone(pcache.get(1), 2)
//         assertCacheValueDone(pcache.get(2), 4)
//         assertCacheValueDone(pcache.get(3), 6)
//       })
//     })

//     it('should optimise the input', () => {
//       const sinonStar = sinon.spy(star)
//       const pcache = new Cache<number, number>()
//       const cs = cacheStar(sinonStar, available, pcache)
//       pcache.set(1, { done: { value: 2, timestamp: 0, promise: Promise.resolve(2) } })
//       return cs([1, 2, 3]).then(ps => {
//         assert.deepEqual(ps, [2, 4, 6])
//         // controllo che la star sia stata chiamata con l'input ottimizzato
//         assert.strictEqual(sinonStar.callCount, 1)
//         assert.deepEqual(sinonStar.firstCall.args, [[2, 3]])
//         // controllo le cache
//         assertCacheValueDone(cs.cache.get([1, 2, 3]), [2, 4, 6])
//         assertCacheValueDone(pcache.get(1), 2)
//         assertCacheValueDone(pcache.get(2), 4)
//         assertCacheValueDone(pcache.get(3), 6)
//       })
//     })

//     it('should not call the star if the input is fully optimised', () => {
//       const sinonStar = sinon.spy(star)
//       const pcache = new Cache<number, number>()
//       const cs = cacheStar(sinonStar, available, pcache)
//       pcache.set(1, { done: { value: 2, timestamp: 0, promise: Promise.resolve(2) } })
//       pcache.set(2, { done: { value: 4, timestamp: 0, promise: Promise.resolve(4) } })
//       pcache.set(3, { done: { value: 6, timestamp: 0, promise: Promise.resolve(6) } })
//       return cs([1, 2, 3]).then(ps => {
//         // controllo il payload
//         assert.deepEqual(ps, [2, 4, 6])
//         // controllo che la star sia stata chiamata con l'input ottimizzato
//         assert.strictEqual(sinonStar.callCount, 0)
//         // controllo le cache
//         assertCacheValueDone(cs.cache.get([1, 2, 3]), [2, 4, 6])
//         assertCacheValueDone(pcache.get(1), 2)
//         assertCacheValueDone(pcache.get(2), 4)
//         assertCacheValueDone(pcache.get(3), 6)
//       })
//     })

//     it('should not call the star after a double fetch', () => {
//       const sinonStar = sinon.spy(star)
//       const pcache = new Cache<number, number>()
//       const cs = cacheStar(sinonStar, available, pcache)
//       cs([1, 2, 3])
//       return cs([1, 2, 3]).then(() => {
//         assert.strictEqual(sinonStar.callCount, 1)
//       })
//     })

//   })

// })
