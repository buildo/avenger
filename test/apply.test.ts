import * as assert from 'assert'
import 'rxjs'

import {
  Leaf,
  ObservableCache,
  available,
  apply
} from '../src'

describe('apply', () => {

  it('should return an observable of dictionaries', () => {
    const cache1 = new ObservableCache<number, number>()
    const fetch1 = (a: number) => Promise.resolve(2 * a)
    const leaf1 = Leaf.create(fetch1, available, cache1)

    const cache2 = new ObservableCache<string, string>()
    const fetch2 = (a: string) => Promise.resolve(`hello ${a}`)
    const leaf2 = Leaf.create(fetch2, available, cache2)

    const observable = apply({
      n: leaf1,
      s: leaf2
    }, {
      n: 1,
      s: 's'
    })
    return new Promise((resolve, reject) => {
      observable.bufferTime(10).take(1).subscribe(events => {
        try {
          assert.deepEqual(events, [
            { loading: true },
            { loading: false, data: { n: 2, s: 'hello s' } }
          ])
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })
  })

})
