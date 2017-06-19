import * as assert from 'assert'
import 'rxjs'

import { Leaf, Composition, Product, ObservableCache, available, CacheValue, Done } from '../src'

describe('invalidate', () => {
  it('should delete caches in a Composition', () => {
    const slaveCache = new ObservableCache<number, number>()
    const slaveFetch = (a: number) => Promise.resolve(2 * a)
    const slave = new Leaf(slaveFetch, available, slaveCache)

    const masterCache = new ObservableCache<string, string>()
    const masterFetch = (a: string) => Promise.resolve(`hello ${a}`)
    const master = new Leaf(masterFetch, available, masterCache)

    const composition = Composition.create(master, slave)(s => s.length)

    masterCache.storeDone('you', new Done('hello you', Date.now(), Promise.resolve('hello you')))
    slaveCache.storeDone(9, new Done(18, Date.now(), Promise.resolve(18)))

    composition.invalidate('you')

    assert.equal(masterCache.get('you'), CacheValue.empty)
    assert.equal(slaveCache.get(9), CacheValue.empty)
  })

  it('should delete caches in a Product', () => {
    const cache1 = new ObservableCache<number, number>()
    const fetch1 = (a: number) => Promise.resolve(2 * a)
    const leaf1 = new Leaf(fetch1, available, cache1)

    const cache2 = new ObservableCache<string, string>()
    const fetch2 = (a: string) => Promise.resolve(`hello ${a}`)
    const leaf2 = new Leaf(fetch2, available, cache2)

    const product = Product.create([leaf1, leaf2])

    cache1.storeDone(9, new Done(18, Date.now(), Promise.resolve(18)))
    cache2.storeDone('you', new Done('hello you', Date.now(), Promise.resolve('hello you')))

    product.invalidate([9, 'you'])

    assert.equal(cache1.get(9), CacheValue.empty)
    assert.equal(cache2.get('you'), CacheValue.empty)
  })

  it('should delete caches in a Leaf', () => {
    const cache = new ObservableCache<number, number>()
    const fetch = (a: number) => Promise.resolve(2 * a)
    const leaf = new Leaf(fetch, available, cache)

    cache.storeDone(9, new Done(18, Date.now(), Promise.resolve(18)))

    leaf.invalidate(9)

    assert.equal(cache.get(9), CacheValue.empty)
  })
})
