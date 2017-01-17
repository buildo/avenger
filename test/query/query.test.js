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
  cacheFetch
} from '../../src/query/operators'

import {
  query
} from '../../src/query/query'

import {
  ObservableCache
} from '../../src/query/ObservableCache'

// L = LOADING event
// P = PAYLOAD event

describe('query', () => {

  describe('fetch', () => {

    it('should emit L + P events for an empty cache', () => {
      const c = new ObservableCache()
      const raw = a => Promise.resolve(2 * a)
      const fetch = cacheFetch(raw, available, c)
      const q = query(fetch, 1)
      return new Promise((resolve, reject) => {
        q.bufferTime(10).take(1).subscribe(events => {
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
      })
    })

    it('should emit L + P events when strategy is refetch, even after a cache hit', () => {
      const c = new ObservableCache()
      c.set(1, { done: { value: 2, timestamp: new Date().getTime(), promise: Promise.resolve(2) } })
      const raw = a => Promise.resolve(2 * a)
      const fetch = cacheFetch(raw, refetch, c)
      const q = query(fetch, 1)
      return new Promise((resolve, reject) => {
        q.bufferTime(10).take(1).subscribe(events => {
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
      const q = query(fetch, [1, 'Giulio'])
      return new Promise((resolve, reject) => {
        q.bufferTime(10).take(1).subscribe(events => {
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
      const q = query(fetch, 'Giulio')
      return new Promise((resolve, reject) => {
        q.bufferTime(10).take(1).subscribe(events => {
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

})
