import * as assert from 'assert'
import 'rxjs'

import {
  Leaf,
  Product,
  Composition,
  ObservableCache,
  available,
  refetch
} from '../src'

// L = LOADING event
// P = PAYLOAD event

describe('observe', () => {

  describe('Leaf', () => {

    it('should not emit events for different inputs', () => {
      const cache = new ObservableCache<number, number>()
      const fetch = (a: number) => Promise.resolve(2 * a)
      const leaf = Leaf.create(fetch, available, cache)
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
        leaf.fetch(2)
      })
    })

    it('should emit L + P events for an empty cache', () => {
      const cache = new ObservableCache<number, number>()
      const fetch = (a: number) => Promise.resolve(2 * a)
      const leaf = Leaf.create(fetch, available, cache)
      const observable = leaf.observe(1)
      return new Promise((resolve, reject) => {
        observable.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              { loading: true },
              { loading: false, data: 2 }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        leaf.fetch(1)
      })
    })

    it('should emit L + P events when strategy is refetch, even after a cache hit', () => {
      const cache = new ObservableCache<number, number>()
      cache.set(1, { done: { value: 2, timestamp: new Date().getTime() - 100, promise: Promise.resolve(2) } })
      const fetch = (a: number) => Promise.resolve(2 * a)
      const leaf = Leaf.create(fetch, refetch, cache)
      const observable = leaf.observe(1)
      return new Promise((resolve, reject) => {
        observable.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              { loading: true },
              { loading: false, data: 2 }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        leaf.fetch(1)
      })
    })

  })

  describe('Product', () => {

    it('should emit L + L + P events for an empty cache', () => {
      const cache1 = new ObservableCache<number, number>()
      const fetch1 = (a: number) => Promise.resolve(2 * a)
      const leaf1 = Leaf.create(fetch1, available, cache1)
      const cache2 = new ObservableCache<string, string>()
      const fetch2 = (a: string) => Promise.resolve(`Hello ${a}`)
      const leaf2 = Leaf.create(fetch2, available, cache2)
      const product = Product.create([leaf1, leaf2])
      const o = product.observe([1, 'foo'])
      return new Promise((resolve, reject) => {
        o.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              { loading: true },
              { loading: false, data: [2, 'Hello foo'] }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        product.fetch([1, 'foo'])
      })
    })

  })

  describe('Composition', () => {

    it('should emit L + P events for an empty cache', () => {
      const slaveCache = new ObservableCache<number, number>()
      const slaveFetch = (a: number) => Promise.resolve(2 * a)
      const slave = Leaf.create(slaveFetch, refetch, slaveCache)
      const masterCache = new ObservableCache<string, string>()
      const masterFetch = (a: string) => Promise.resolve(`Hello ${a}`)
      const master = Leaf.create(masterFetch, refetch, masterCache)
      const composition = Composition.create(master, s => s.length, slave)
      const observable = composition.observe('foo')
      return new Promise((resolve, reject) => {
        observable.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              { loading: true },
              { loading: false, data: 18 }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        composition.fetch('foo')
      })
    })

    it('should emit L + P + L + P events when slave strategy is refetch', () => {
      let i = 1
      const slaveCache = new ObservableCache<number, number>()
      const slaveFetch = (a: number) => {
        i++
        return Promise.resolve(i * a)
      }
      const slave = Leaf.create(slaveFetch, refetch, slaveCache)
      const masterCache = new ObservableCache<string, string>()
      const masterFetch = (a: string) => Promise.resolve(`Hello ${a}`)
      const master = Leaf.create(masterFetch, refetch, masterCache)
      const composition = Composition.create(master, s => s.length, slave)
      const observable = composition.observe('foo')
      return new Promise((resolve, reject) => {
        observable.bufferTime(20).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              {
                "loading": true
              },
              {
                "data": 18,
                "loading": false
              },
              {
                "data": 18,
                "loading": true
              },
              {
                "data": 27,
                "loading": false
              }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        composition.fetch('foo')
        setTimeout(() => {
          composition.fetch('foo')
        }, 10)
      })
    })

    it('should emit L + P events when slave strategy is available', () => {
      const slaveCache = new ObservableCache<number, number>()
      const slaveFetch = (a: number) => Promise.resolve(2 * a)
      const slave = Leaf.create(slaveFetch, available, slaveCache)
      const masterCache = new ObservableCache<string, string>()
      const masterFetch = (a: string) => Promise.resolve(`Hello ${a}`)
      const master = Leaf.create(masterFetch, refetch, masterCache)
      const composition = Composition.create(master, s => s.length, slave)
      const observable = composition.observe('foo')
      return new Promise((resolve, reject) => {
        observable.bufferTime(30).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              { loading: true },
              { loading: false, data: 18 }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        composition.fetch('foo')
        setTimeout(() => {
          composition.fetch('foo')
        }, 10)
      })
    })

    it('should emit L + P calling master', () => {
      const slaveCache = new ObservableCache<number, number>()
      const slaveFetch = (a: number) => Promise.resolve(2 * a)
      const slave = Leaf.create(slaveFetch, available, slaveCache)
      const masterCache = new ObservableCache<string, string>()
      const masterFetch = (a: string) => Promise.resolve(`Hello ${a}`)
      const master = Leaf.create(masterFetch, available, masterCache)
      const composition = Composition.create(master, s => s.length, slave)
      const observable = composition.observe('foo')
      return new Promise((resolve, reject) => {
        observable.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              { loading: true },
              { loading: false, data: 18 }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        master.fetch('foo')
      })
    })

    it('should not emit events calling slave', () => {
      const slaveCache = new ObservableCache<number, number>()
      const slaveFetch = (a: number) => Promise.resolve(2 * a)
      const slave = Leaf.create(slaveFetch, refetch, slaveCache)
      const masterCache = new ObservableCache<string, string>()
      const masterFetch = (a: string) => Promise.resolve(`Hello ${a}`)
      const master = Leaf.create(masterFetch, available, masterCache)
      const composition = Composition.create(master, s => s.length, slave)
      const observable = composition.observe('foo')
      return new Promise((resolve, reject) => {
        observable.bufferTime(20).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              { loading: true },
              { loading: false, data: 18 },
              { loading: true, data: 18 },
              { loading: false, data: 18 }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        composition.fetch('foo')
        setTimeout(() => {
          slave.fetch(9)
        }, 10)
      })
    })

  })

})
