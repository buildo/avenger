import * as assert from 'assert'
import 'rxjs'

import { none, some } from 'fp-ts/lib/Option'
import { Leaf, Product, Composition, available, refetch, ObservableCache, Done } from '../src'

// L = LOADING event
// P = PAYLOAD event

describe('observe', () => {
  describe('Leaf', () => {
    it('should not emit events for different inputs', () => {
      const fetch = (a: number) => Promise.resolve(2 * a)
      const leaf = new Leaf(fetch, available)
      const observable = leaf.observe(1)
      return new Promise((resolve, reject) => {
        observable.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        leaf.run(2)
      })
    })

    it('should emit L + P events for an empty cache', () => {
      const fetch = (a: number) => Promise.resolve(2 * a)
      const leaf = new Leaf(fetch, available)
      const observable = leaf.observe(1)
      return new Promise((resolve, reject) => {
        observable.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [{ loading: true, data: none }, { loading: false, data: some(2) }])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        leaf.run(1)
      })
    })

    it('should emit L + L + P events when strategy is refetch, even after a cache hit', () => {
      const cache = new ObservableCache<number, number>()
      cache.storeDone(1, new Done(2, Date.now() - 100, Promise.resolve(2)))
      const fetch = (a: number) => Promise.resolve(2 * a)
      const leaf = new Leaf(fetch, refetch, cache)
      const observable = leaf.observe(1)
      return new Promise((resolve, reject) => {
        observable.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              { loading: false, data: some(2) },
              { loading: true, data: some(2) },
              { loading: false, data: some(2) }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        leaf.run(1)
      })
    })
  })

  describe('Product', () => {
    it('should emit L + P events for an empty cache', () => {
      const fetch1 = (a: number) => Promise.resolve(2 * a)
      const leaf1 = new Leaf(fetch1, available)
      const fetch2 = (a: string) => Promise.resolve(`Hello ${a}`)
      const leaf2 = new Leaf(fetch2, available)
      const product = Product.create([leaf1, leaf2])
      const o = product.observe([1, 'foo'])
      return new Promise((resolve, reject) => {
        o.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [{ loading: true, data: none }, { loading: false, data: some([2, 'Hello foo']) }])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        product.run([1, 'foo'])
      })
    })
  })

  describe('Composition', () => {
    it('should emit L + P events for an empty cache', () => {
      const slaveFetch = (a: number) => Promise.resolve(2 * a)
      const slave = new Leaf(slaveFetch, refetch)
      const masterFetch = (a: string) => Promise.resolve(`Hello ${a}`)
      const master = new Leaf(masterFetch, refetch)
      const composition = Composition.create(master, slave)(s => s.length)
      const observable = composition.observe('foo')
      return new Promise((resolve, reject) => {
        observable.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [{ loading: true, data: none }, { loading: false, data: some(18) }])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        composition.run('foo')
      })
    })

    it('should emit L + P + L + P events when slave strategy is refetch', () => {
      let i = 1
      const slaveFetch = (a: number) => {
        i++
        return Promise.resolve(i * a)
      }
      const slave = new Leaf(slaveFetch, refetch)
      const masterFetch = (a: string) => Promise.resolve(`Hello ${a}`)
      const master = new Leaf(masterFetch, refetch)
      const composition = Composition.create(master, slave)(s => s.length)
      const observable = composition.observe('foo')
      return new Promise((resolve, reject) => {
        observable.bufferTime(20).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              {
                loading: true,
                data: none
              },
              {
                data: some(18),
                loading: false
              },
              {
                data: some(18),
                loading: true
              },
              {
                data: some(27),
                loading: false
              }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        composition.run('foo')
        setTimeout(() => {
          composition.run('foo')
        }, 10)
      })
    })

    it('should emit L + P events when slave strategy is available', () => {
      const slaveFetch = (a: number) => Promise.resolve(2 * a)
      const slave = new Leaf(slaveFetch, available)
      const masterFetch = (a: string) => Promise.resolve(`Hello ${a}`)
      const master = new Leaf(masterFetch, refetch)
      const composition = Composition.create(master, slave)(s => s.length)
      const observable = composition.observe('foo')
      return new Promise((resolve, reject) => {
        observable.bufferTime(30).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [{ loading: true, data: none }, { loading: false, data: some(18) }])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        composition.run('foo')
        setTimeout(() => {
          composition.run('foo')
        }, 10)
      })
    })

    it('should emit L + P calling master', () => {
      const slaveFetch = (a: number) => Promise.resolve(2 * a)
      const slave = new Leaf(slaveFetch, available)
      const masterFetch = (a: string) => Promise.resolve(`Hello ${a}`)
      const master = new Leaf(masterFetch, available)
      const composition = Composition.create(master, slave)(s => s.length)
      const observable = composition.observe('foo')
      return new Promise((resolve, reject) => {
        observable.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [{ loading: true, data: none }, { loading: false, data: some(18) }])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        master.run('foo')
      })
    })

    it('should emit events calling slave', () => {
      const slaveFetch = (a: number) => Promise.resolve(2 * a)
      const slave = new Leaf(slaveFetch, refetch)
      const masterFetch = (a: string) => Promise.resolve(`Hello ${a}`)
      const master = new Leaf(masterFetch, available)
      const composition = Composition.create(master, slave)(s => s.length)
      const observable = composition.observe('foo')
      return new Promise((resolve, reject) => {
        observable.bufferTime(20).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              { loading: true, data: none },
              { loading: false, data: some(18) },
              { loading: true, data: some(18) },
              { loading: false, data: some(18) }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        composition.run('foo')
        setTimeout(() => {
          slave.run(9)
        }, 10)
      })
    })
  })
})
