import * as assert from 'assert'
import 'rxjs'

import { none, some } from 'fp-ts/lib/Option'
import {
  Leaf,
  available,
  Queries
} from '../src'

describe('Queries', () => {

  it('should merge inputs and reutrn an array of outputs', () => {
    let i = 0
    const fetch1 = (a: { a1: string }) => Promise.resolve({ p1: (2 * a.a1.length) + (i++) })
    const leaf1 = new Leaf(fetch1, available)

    const fetch2 = (a: { a2: number }) => Promise.resolve({ p2: a.a2 > 0 })
    const leaf2 = new Leaf(fetch2, available)

    const fetch3 = (a: { a3: number }) => Promise.resolve({ p3: a.a3 > 0 })
    const leaf3 = new Leaf(fetch3, available)

    const observable = Queries.create([leaf1, leaf2, leaf3]).observe({ a1: 'hello', a2: 2, a3: 4 })

    return new Promise((resolve, reject) => {
      observable.bufferTime(10).take(1).subscribe(events => {
        try {
          assert.deepEqual(events, [
            [{ loading: true, data: none }, { loading: true, data: none }, { loading: true, data: none }],
            [{ loading: false, data: some({ p1: 10 }) }, { loading: true, data: none }, { loading: true, data: none }],
            [{ loading: false, data: some({ p1: 10 }) }, { loading: false, data: some({ p2: true }) }, { loading: true, data: none }],
            [{ loading: false, data: some({ p1: 10 }) }, { loading: false, data: some({ p2: true }) }, { loading: false, data: some({ p3: true }) }]
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
