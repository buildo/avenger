import * as assert from 'assert'
import * as sinon from 'sinon'

import {
  product,
  star,
  compose,
  Fetch,
  TypedFetch
} from '../../src/fetch/operators'

function spy<A, P>(f: Fetch<A, P>): TypedFetch<A, P> & sinon.SinonSpy {
  return sinon.spy(f) as any
}

describe('fetch/operators', () => {

  describe('product', () => {

    it('should return a fetch', () => {
      const f1 = spy((a: number) => Promise.resolve(2 * a))
      const f2 = spy((a: number) => Promise.resolve(a - 1))
      const f3 = product({ f1, f2 })
      return f3({ f1: 1, f2: 1 }).then(p => {
        // controllo che le fetch siano state chiamate esattamente una volta
        assert.equal(f1.callCount, 1)
        assert.equal(f2.callCount, 1)
        // controllo il payload
        assert.deepEqual(p, { f1: 2, f2: 0 })
      })
    })

  })

  describe('star', () => {

    it('should return a fetch', () => {
      const f1 = spy((a: number) => Promise.resolve(2 * a))
      const f2 = star(f1)
      return f2([1, 2]).then(ps => {
        // controllo che la fetch sia stata chiamata esattamente due volte
        assert.equal(f1.callCount, 2)
        // controllo il payload
        assert.deepEqual(ps, [2, 4])
      })
    })

  })

  describe('compose', () => {

    it('should return a fetch', () => {
      const f1 = spy((a: number) => Promise.resolve(2 * a))
      const f2 = spy((a: string) => Promise.resolve(`Hello ${a}`))
      const f3 = compose(f2, x => x.length, f1)
      return f3('Giulio').then(p => {
        // controllo che le fetch siano state chiamate esattamente una volta
        assert.equal(f1.callCount, 1)
        assert.equal(f2.callCount, 1)
        // controllo il payload
        // assert.deepEqual(p, [24, 'Hello Giulio'])
        assert.strictEqual(p, 24)
      })
    })

  })

})
