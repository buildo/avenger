import * as assert from 'assert'
import 'rxjs'
import * as t from 'io-ts'

import { some } from 'fp-ts/lib/Option'
import {
  Leaf,
  Done
} from '../src'

describe('getCacheEvent', () => {

  it('should ignore additional arguments', () => {
    const fetch = (a: { a: string }) => Promise.resolve(`hello ${a.a}`)
    const params = {
      a: t.string
    }
    const leaf = Leaf.create({
      params,
      fetch
    })

    const cache = (leaf as any).cache
    cache.storeDone({ a: 'a' }, new Done('hello a', Date.now(), Promise.resolve('hello a')))

    assert.deepEqual(leaf.getCacheEvent({ a: 'a', b: 1 } as any).data, some('hello a'))
  })

})
