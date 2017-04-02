import * as assert from 'assert'

import { none, some } from 'fp-ts/lib/Option'
import {
  Leaf,
  ObservableCache,
  available,
  applySync
} from '../src'

describe('applySync', () => {

  it('should return a dictionary even if data is not available', () => {
    const cache1 = new ObservableCache<number, number>()
    const fetch1 = (a: number) => Promise.resolve(2 * a)
    const leaf1 = Leaf.create(fetch1, available, cache1)

    const cache2 = new ObservableCache<string, string>()
    const fetch2 = (a: string) => Promise.resolve(`hello ${a}`)
    const leaf2 = Leaf.create(fetch2, available, cache2)

    const dict = applySync({
      n: leaf1,
      s: leaf2
    }, {
      n: 1,
      s: 's'
    })
    assert.deepEqual(dict, { loading: true, data: none })
  })

  it('should return a dictionary with data if available', () => {
    const cache1 = new ObservableCache<number, number>()
    const fetch1 = (a: number) => Promise.resolve(2 * a)
    const leaf1 = Leaf.create(fetch1, available, cache1)

    const cache2 = new ObservableCache<string, string>()
    const fetch2 = (a: string) => Promise.resolve(`hello ${a}`)
    const leaf2 = Leaf.create(fetch2, available, cache2)

    cache1.storeDone(1, { value: 2, promise: Promise.resolve(2), timestamp: Date.now() })
    cache2.storeDone('s', { value: 'hello s', promise: Promise.resolve('hello s'), timestamp: Date.now() })

    const dict = applySync({
      n: leaf1,
      s: leaf2
    }, {
      n: 1,
      s: 's'
    })
    assert.deepEqual(dict, { loading: false, data: some({ n: 2, s: 'hello s' }) })
  })

})
