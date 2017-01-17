import assert from 'assert'
import 'rxjs'

import {
  product,
  compose
} from '../../src/fetch/operators'

import {
  available,
  refetch
} from '../../src/cache/strategies'

import {
  cacheFetch,
  cacheCatalog
} from '../../src/query/operators'

import {
  observe
} from '../../src/query/observe'

import {
  ObservableCache
} from '../../src/query/ObservableCache'

// L = LOADING event
// P = PAYLOAD event

describe('observe', () => {

  describe('fetch', () => {

    it('should not emit events for different inputs', () => {
      const c = new ObservableCache()
      const raw = a => Promise.resolve(2 * a)
      const fetch = cacheFetch(raw, available, c)
      const o = observe(fetch, 1)
      return new Promise((resolve, reject) => {
        o.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        fetch(2)
      })
    })

    it('should emit L + P events for an empty cache', () => {
      const c = new ObservableCache()
      const raw = a => Promise.resolve(2 * a)
      const fetch = cacheFetch(raw, available, c)
      const o = observe(fetch, 1)
      return new Promise((resolve, reject) => {
        o.bufferTime(10).take(1).subscribe(events => {
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
        fetch(1)
      })
    })

    it('should emit L + P events when strategy is refetch, even after a cache hit', () => {
      const c = new ObservableCache()
      c.set(1, { done: { value: 2, timestamp: new Date().getTime(), promise: Promise.resolve(2) } })
      const raw = a => Promise.resolve(2 * a)
      const fetch = cacheFetch(raw, refetch, c)
      const o = observe(fetch, 1)
      return new Promise((resolve, reject) => {
        o.bufferTime(10).take(1).subscribe(events => {
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
        fetch(1)
      })
    })

  })

  describe('product', () => {

    it('should emit L + L + P events for an empty cache', () => {
      const c1 = new ObservableCache()
      const raw1 = a => Promise.resolve(2 * a)
      const fetch1 = cacheFetch(raw1, available, c1)
      const c2 = new ObservableCache()
      const raw2 = a => Promise.resolve(`Hello ${a}`)
      const fetch2 = cacheFetch(raw2, available, c2)
      const fetch = product([fetch1, fetch2])
      const o = observe(fetch, [1, 'Giulio'])
      return new Promise((resolve, reject) => {
        o.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              [
                { loading: true },
                { loading: true }
              ],
              [
                { loading: false, data: 2 },
                { loading: true }
              ],
              [
                { loading: false, data: 2 },
                { loading: false, data: 'Hello Giulio' }
              ]
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        fetch([1, 'Giulio'])
      })
    })

  })

  describe('composition', () => {

    it('should emit L + P events for an empty cache', () => {
      const c = new ObservableCache()
      const fetch1 = a => Promise.resolve(2 * a)
      const fetch2 = a => Promise.resolve(`Hello ${a}`)
      const fetch = cacheFetch(compose(fetch2, s => s.length, fetch1), available, c)
      const o = observe(fetch, 'Giulio')
      return new Promise((resolve, reject) => {
        o.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              { loading: true },
              { loading: false, data: 24 }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        fetch('Giulio')
      })
    })

  })

  describe('catalog', () => {

    it('should emit L + P events for an empty pcache', () => {
      const catalog = () => Promise.resolve([1, 2, 3].map(a => 2 * a))
      const pc = new ObservableCache()
      const cc = cacheCatalog(catalog, available, pc, (p) => p / 2)
      const o = observe(cc, undefined)
      return new Promise((resolve, reject) => {
        o.bufferTime(10).take(1).subscribe(events => {
          try {
            assert.deepEqual(events, [
              { loading: true },
              { loading: false, data: [2, 4, 6] }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
        cc()
      })
    })

  })

})
