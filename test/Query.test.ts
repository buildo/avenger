import * as assert from 'assert'
import 'rxjs'
import * as t from 'io-ts'

import {
  Query,
  available
} from '../src'

describe('Query', () => {

  const q1 = Query({
    // id: 'q1',
    cacheStrategy: available,
    params: {
      n: t.number
    },
    fetch: a => Promise.resolve(a.n * 2),
    dependencies: {}
  })

  const q2 = Query({
    // id: 'q2',
    cacheStrategy: available,
    params: {
      s: t.string
    },
    fetch: a => Promise.resolve(a.s.length),
    dependencies: {}
  })

  const q3 = Query({
    cacheStrategy: available,
    params: {
      b: t.boolean
    },
    fetch: a => {
      return Promise.resolve(a.b ? a.q1 : a.q2)
    },
    dependencies: {
      q1,
      q2
    }
  })

  it('should handle no dependencies', () => {
    return q1.run({ n: 1 }).then(p => {
      assert.strictEqual(p, 2)
    })
  })

  it('should handle dependencies', () => {
    return q3.run({ n: 1, s: 'hello', b: false }).then(p => {
      assert.strictEqual(p, 5)
    })
  })

  it('should handle dependencies of dependencies', () => {
    const q4 = Query({
      cacheStrategy: available,
      params: {},
      fetch: a => Promise.resolve(a.q3),
      dependencies: {
        q3
      }
    })
    return q4.run({ n: 1, s: 'hello', b: true }).then(p => {
      assert.strictEqual(p, 2)
    })
  })

})
