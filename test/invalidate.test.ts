import * as assert from 'assert'
import 'rxjs'

import {
  Leaf,
  Composition,
  Product,
  ObservableCache,
  available,
  empty
} from '../src'

describe('invalidate', () => {

  it('should delete caches in a Composition', () => {
    const slaveCache = new ObservableCache<number, number>()
    const slaveFetch = (a: number) => Promise.resolve(2 * a)
    const slave = Leaf.create(slaveFetch, available, slaveCache)

    const masterCache = new ObservableCache<string, string>()
    const masterFetch = (a: string) => Promise.resolve(`hello ${a}`)
    const master = Leaf.create(masterFetch, available, masterCache)

    const composition = Composition.create(master, s => s.length, slave)

    masterCache.storePayload('you', 'hello you', Promise.resolve('hello you'))
    slaveCache.storePayload(9, 18, Promise.resolve(18))

    composition.invalidate('you')

    assert.equal(masterCache.get('you'), empty)
    assert.equal(slaveCache.get(9), empty)
  })

  it('should delete caches in a Product', () => {
    const cache1 = new ObservableCache<number, number>()
    const fetch1 = (a: number) => Promise.resolve(2 * a)
    const leaf1 = Leaf.create(fetch1, available, cache1)

    const cache2 = new ObservableCache<string, string>()
    const fetch2 = (a: string) => Promise.resolve(`hello ${a}`)
    const leaf2 = Leaf.create(fetch2, available, cache2)

    const product = Product.create([leaf1, leaf2])

    cache1.storePayload(9, 18, Promise.resolve(18))
    cache2.storePayload('you', 'hello you', Promise.resolve('hello you'))

    product.invalidate([9, 'you'])

    assert.equal(cache1.get(9), empty)
    assert.equal(cache2.get('you'), empty)
  })

  it('should delete caches in a Leaf', () => {
    const cache = new ObservableCache<number, number>()
    const fetch = (a: number) => Promise.resolve(2 * a)
    const leaf = Leaf.create(fetch, available, cache)

    cache.storePayload(9, 18, Promise.resolve(18))

    leaf.invalidate(9)

    assert.equal(cache.get(9), empty)
  })

})
