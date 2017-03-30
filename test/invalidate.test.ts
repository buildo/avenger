import * as assert from 'assert'
import 'rxjs'

import {
  Leaf,
  Composition,
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

    masterCache.set('you', { done: { value: 'hello you', timestamp: new Date().getTime(), promise: Promise.resolve('hello you') } })
    slaveCache.set(9, { done: { value: 18, timestamp: new Date().getTime(), promise: Promise.resolve(18) } })

    composition.invalidate('you')

    assert.equal(masterCache.get('you'), empty)
    assert.equal(slaveCache.get(9), empty)
  })

})
