import * as assert from 'assert'
import 'rxjs'

import { none, some } from 'fp-ts/lib/Option'
import {
  Leaf,
  ObservableCache,
  available,
  Merge
} from '../src'

describe('Merge', () => {

  it.only('should merge inputs and outputs (array)', () => {
    let i = 0
    const cache1 = new ObservableCache<{ a1: string }, { p1: number }>()
    const fetch1 = (a: { a1: string }) => Promise.resolve({ p1: 2 * a.a1.length + (i++) })
    const leaf1 = Leaf.create(fetch1, available, cache1)
    const cache2 = new ObservableCache<{ a2: number }, { p2: boolean }>()
    const fetch2 = (a: { a2: number }) => Promise.resolve({ p2: a.a2 > 0 })
    const leaf2 = Leaf.create(fetch2, available, cache2)
    const observable = Merge.create([leaf1, leaf2]).observe({ a1: 'hello', a2: 2 })
    return new Promise((resolve, reject) => {
      observable.bufferTime(10).take(1).subscribe(events => {
        try {
          assert.deepEqual(events, [
            [{ loading: true, data: none }, { loading: true, data: none }],
            [{ loading: true, data: none }, { loading: true, data: none }],
            [{ loading: false, data: some({ p1: 10 }) }, { loading: true, data: none }],
            [{ loading: false, data: some({ p1: 10 }) }, { loading: false, data: some({ p2: true }) }]
          ])
          resolve()
        } catch (e) {
          reject(e)
        }
      })
      leaf1.invalidate({ a1: 'hello' })
      leaf1.run({ a1: 'hello' })
    })
  })

})
