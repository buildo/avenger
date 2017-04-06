import * as assert from 'assert'
import 'rxjs'

import {
  Leaf,
  Composition,
  Product,
  ObservableCache,
  available,
  emptyCacheValue
} from '../src'

describe('invalidate', () => {

  it('should delete caches in a Composition', () => {
    const slaveCache = new ObservableCache<number, number>()
    const slaveFetch = (a: number) => Promise.resolve(2 * a)
    const slave = Leaf.create(slaveFetch, available, slaveCache)

    const masterCache = new ObservableCache<string, string>()
    const masterFetch = (a: string) => Promise.resolve(`hello ${a}`)
    const master = Leaf.create(masterFetch, available, masterCache)

    const composition = Composition.create(master, slave)(s => s.length)

    masterCache.storeDone('you', { value: 'hello you', timestamp: new Date().getTime(), promise: Promise.resolve('hello you') })
    slaveCache.storeDone(9, { value: 18, timestamp: new Date().getTime(), promise: Promise.resolve(18) })

    composition.invalidate('you')

    assert.equal(masterCache.get('you'), emptyCacheValue)
    assert.equal(slaveCache.get(9), emptyCacheValue)
  })

  it('should delete caches in a Product', () => {
    const cache1 = new ObservableCache<number, number>()
    const fetch1 = (a: number) => Promise.resolve(2 * a)
    const leaf1 = Leaf.create(fetch1, available, cache1)

    const cache2 = new ObservableCache<string, string>()
    const fetch2 = (a: string) => Promise.resolve(`hello ${a}`)
    const leaf2 = Leaf.create(fetch2, available, cache2)

    const product = Product.create([leaf1, leaf2])

    cache1.storeDone(9, { value: 18, timestamp: new Date().getTime(), promise: Promise.resolve(18) })
    cache2.storeDone('you', { value: 'hello you', timestamp: new Date().getTime(), promise: Promise.resolve('hello you') })

    product.invalidate([9, 'you'])

    assert.equal(cache1.get(9), emptyCacheValue)
    assert.equal(cache2.get('you'), emptyCacheValue)
  })

  it('should delete caches in a Leaf', () => {
    const cache = new ObservableCache<number, number>()
    const fetch = (a: number) => Promise.resolve(2 * a)
    const leaf = Leaf.create(fetch, available, cache)

    cache.storeDone(9, { value: 18, timestamp: new Date().getTime(), promise: Promise.resolve(18) })

    leaf.invalidate(9)

    assert.equal(cache.get(9), emptyCacheValue)
  })

})
