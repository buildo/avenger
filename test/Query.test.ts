import * as assert from 'assert'
import 'rxjs'
import * as t from 'io-ts'

import {
  Query,
  available
} from '../src'

describe('Query', () => {

  const q1 = Query({
    cacheStrategy: available,
    params: {
      n: t.number
    },
    fetch: a => Promise.resolve(a.n * 2)
  })

  const q2 = Query({
    cacheStrategy: available,
    params: {
      s: t.string
    },
    fetch: a => Promise.resolve(a.s.length)
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
    },
    atok: a => String(a.b)
  })

  it('should handle no dependencies', () => {
    return q1.run({ n: 1 }).then(p => {
      assert.strictEqual(p, 2)
    })
  })

  it('should handle dependencies', () => {
    return q3.run({ b: false, q1: { n: 1 }, q2: { s: 'hello' } }).then(p => {
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
    return q4.run({ q3: { b: true, q1: { n: 1 }, q2: { s: 'hello' } } }).then(p => {
      assert.strictEqual(p, 2)
    })
  })

})
