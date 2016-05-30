/* global describe,it */
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

const createState = (loading, data) => ({ loading, data })

describe('query', () => {

  describe('fetch', () => {

    it('should emit L + P events for an empty cache', (done) => {
      const c = new ObservableCache()
      const raw = a => Promise.resolve(2 * a)
      const fetch = cacheFetch(raw, available, c)
      const q = query(fetch, 1)
      q.bufferTime(10).take(1).subscribe(events => {
        assert.deepEqual(events, [
          { loading: true },
          { loading: false, data: 2 }
        ])
        done()
      })
    })

    it('should emit L + P events when strategy is refetch, even after a cache hit', (done) => {
      const c = new ObservableCache()
      c.set(1, { done: { value: 2, timestamp: new Date().getTime(), promise: Promise.resolve(2) } })
      const raw = a => Promise.resolve(2 * a)
      const fetch = cacheFetch(raw, refetch, c)
      const q = query(fetch, 1)
      q.bufferTime(10).take(1).subscribe(events => {
        assert.deepEqual(events, [
          { loading: true },
          { loading: false, data: 2 }
        ])
        done()
      })
    })

  })

  describe('product', () => {

    it('should emit L + L + P events for an empty cache', (done) => {
      const c1 = new ObservableCache()
      const raw1 = a => Promise.resolve(2 * a)
      const fetch1 = cacheFetch(raw1, available, c1)
      const c2 = new ObservableCache()
      const raw2 = a => Promise.resolve('Hello ' + a)
      const fetch2 = cacheFetch(raw2, available, c2)
      const fetch = product([fetch1, fetch2])
      const q = query(fetch, [1, 'Giulio'])
      q.bufferTime(10).take(1).subscribe(events => {
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
        done()
      })
      fetch([1, 'Giulio'])
    })

  })

  describe('composition', () => {

    it('should emit L + P events for an empty cache', (done) => {
      const c = new ObservableCache()
      const fetch1 = a => Promise.resolve(2 * a)
      const fetch2 = a => Promise.resolve('Hello ' + a)
      const fetch = cacheFetch(compose(fetch2, s => s.length, fetch1), available, c)
      const q = query(fetch, 'Giulio')
      q.bufferTime(10).take(1).subscribe(events => {
        assert.deepEqual(events, [
          { loading: true },
          { loading: false, data: 24 }
        ])
        done()
      })
      fetch('Giulio')
    })

  })

})