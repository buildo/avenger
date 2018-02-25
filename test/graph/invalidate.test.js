import assert from 'assert'
import 'rxjs'
import { Query as Node } from '../../src/graph/QueryNode'
import { invalidate, query } from '../../src/graph';

describe('graph/invalidate', () => {

  const makeLeafNodes = Ps => Ps.reduce((ac, P) => ({
    ...ac,
    [P]: Node({
      id: P,
      params: { token: true },
      fetch: v => new Promise(resolve => {
        setTimeout(() => resolve(v))
      })
    })
  }), {})

  it('should refetch a single leaf node if it has observers', () => {

    const { A } = makeLeafNodes(['A', 'B'])

    const q = query({ A }, { token: 'lol' })
    q.subscribe(() => {}) // subscribe

    setTimeout(() => { // invalidate later on
      invalidate({ A }, { token: 'lol' })
    }, 5)

    return new Promise((resolve, reject) => {
      q.bufferTime(10).take(1).subscribe(events => {
        try {
          assert.deepEqual(events, [
            { loading: true, data: { A: { loading: true } } },
            { loading: false, data: { A: { loading: false, data: { token: 'lol' } } } },
            { loading: true, data: { A: { loading: true, data: { token: 'lol' } } } },
            { loading: false, data: { A: { loading: false, data: { token: 'lol' } } } }
          ])
          resolve()
        } catch (e) {
          reject(e);
        }
      })
    })
  })

  it('should not refetch a single leaf node if it has no observers', () => {

    const { A } = makeLeafNodes(['A', 'B'])

    const q = query({ A }, { token: 'lol' })

    invalidate({ A }, { token: 'lol' }) // do not subscribe and invalidate right away

    return new Promise((resolve, reject) => {
      q.bufferTime(10).take(1).subscribe(events => {
        try {
          assert.deepEqual(events, [
            { loading: true, data: { A: { loading: true } } },
            { loading: false, data: { A: { loading: false, data: { token: 'lol' } } } }
          ])
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })
  })

  it('should refetch multiple leaf nodes if they have observers', () => {

    const { A, C } = makeLeafNodes(['A', 'B', 'C'])

    const q = query({ A, C }, { token: 'lol' })
    q.subscribe(() => {})

    setTimeout(() => {
      invalidate({ A, C }, { token: 'lol' })
    }, 5)

    return new Promise((resolve, reject) => {
      q.bufferTime(10).take(1).subscribe(events => {
        try {
          assert.deepEqual(events, [
            { loading: true, data: {
              A: { loading: true }, C: { loading: true } }
            },
            { loading: true, data: {
              A: { loading: false, data: { token: 'lol' } }, C: { loading: true } }
            },
            { loading: false, data: {
              A: { loading: false, data: { token: 'lol' } }, C: { loading: false, data: { token: 'lol' } } }
            },
            { loading: true, data: {
              A: { loading: true, data: { token: 'lol' } }, C: { loading: false, data: { token: 'lol' } } }
            },
            { loading: true, data: {
              A: { loading: true, data: { token: 'lol' } }, C: { loading: true, data: { token: 'lol' } } }
            },
            { loading: true, data: {
              A: { loading: false, data: { token: 'lol' } }, C: { loading: true, data: { token: 'lol' } } }
            },
            { loading: false, data: {
              A: { loading: false, data: { token: 'lol' } }, C: { loading: false, data: { token: 'lol' } } }
            }
          ])
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })
  })

  describe('in a complex setup', () => {

    const makeTestGraph = () => {
      const A = Node({
        id: 'A',
        params: { token: true },
        fetch: ({ token }) => new Promise(resolve => {
          setTimeout(() => resolve({ id: 1, token }))
        })
      })
      const B = Node({
        id: 'B',
        params: { token: true },
        dependencies: {
          user: { query: A }
        },
        fetch: ({ token, user }) => new Promise(resolve => {
          setTimeout(() => resolve({ posts: [`p${user.id}`], token }))
        })
      })
      const C = Node({
        id: 'C',
        params: { token: true },
        dependencies: {
          user: { query: A }
        },
        fetch: ({ token, user }) => new Promise(resolve => {
          setTimeout(() => resolve({ profile: `p${user.id}`, token }))
        })
      })

      return { A, B, C }
    }

    it('should refetch observed nodes', () => {

      const { A, B } = makeTestGraph()

      const q1 = query({ A, B }, { token: 'lol' })

      q1.subscribe(() => {}) // add a subscriber

      setTimeout(() => {
        invalidate({ A }, { token: 'lol' }) // invalidate later on
      }, 5)

      return new Promise((resolve, reject) => {
        q1.bufferTime(50).take(1).subscribe(events => {
          try {
            assert.equal(events.length, 9);
            // interesting events are until the 7th here
            // following events: we'd like to get rid of them, eventually
            // debounce + distinct at user level should avoid any issue for now
            assert.deepEqual(events.slice(0, 7), [
              // query()
              { loading: true, data: {
                A: { loading: true }, B: { loading: true } }
              },
              { loading: true, data: {
                A: { loading: false, data: { id: 1, token: 'lol' } }, B: { loading: true } }
              },
              { loading: false, data: {
                A: { loading: false, data: { id: 1, token: 'lol' } }, B: { loading: false, data: { posts: ['p1'], token: 'lol' } } }
              },
              // invalidate()
              { loading: true, data: {
                A: { loading: true, data: { id: 1, token: 'lol' } }, B: { loading: false, data: { posts: ['p1'], token: 'lol' } } }
              },
              { loading: true, data: {
                A: { loading: true, data: { id: 1, token: 'lol' } }, B: { loading: true, data: { posts: ['p1'], token: 'lol' } } }
              },
              { loading: true, data: {
                A: { loading: false, data: { id: 1, token: 'lol' } }, B: { loading: true, data: { posts: ['p1'], token: 'lol' } } }
              },
              { loading: false, data: {
                A: { loading: false, data: { id: 1, token: 'lol' } }, B: { loading: false, data: { posts: ['p1'], token: 'lol' } } }
              }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
      })
    })

    it('should refetch observed nodes 2', () => {

      const { A, B, C } = makeTestGraph()

      const q1 = query({ B, C }, { token: 'lol' })

      q1.subscribe(() => {}) // add a subscriber

      setTimeout(() => {
        invalidate({ A }, { token: 'lol' }) // invalidate later on
      }, 5)

      return new Promise((resolve, reject) => {
        q1.bufferTime(50).take(1).subscribe(events => {
          try {
            assert.equal(events.length, 11);
            // interesting events are until the 7th here
            // following events: we'd like to get rid of them, eventually
            // debounce + distinct at user level should avoid any issue for now
            assert.deepEqual(events.slice(0, 7), [
              // query()
              { loading: true, data: {
                B: { loading: true },
                C: { loading: true } }
              },
              { loading: true, data: {
                B: { loading: false, data: {
                  posts: ['p1'], token: 'lol' }
                },
                C: { loading: true } }
              },
              { loading: false, data: {
                B: { loading: false, data: {
                  posts: ['p1'], token: 'lol'
                } },
                C: { loading: false, data: {
                  profile: 'p1', token: 'lol'
                } } }
              },
              // invalidate()
              { loading: true, data: {
                B: { loading: true, data: {
                  posts: ['p1'], token: 'lol'
                } },
                C: { loading: false, data: {
                  profile: 'p1', token: 'lol'
                } } }
              },
              { loading: true, data: {
                B: { loading: true, data: {
                  posts: ['p1'], token: 'lol'
                } },
                C: { loading: true, data: {
                  profile: 'p1', token: 'lol'
                } } }
              },
              { loading: true, data: {
                B: { loading: false, data: {
                  posts: ['p1'], token: 'lol'
                } },
                C: { loading: true, data: {
                  profile: 'p1', token: 'lol'
                } } }
              },
              { loading: false, data: {
                B: { loading: false, data: {
                  posts: ['p1'], token: 'lol'
                } },
                C: { loading: false, data: {
                  profile: 'p1', token: 'lol'
                } } }
              }
            ])
            resolve()
          } catch (e) {
            reject(e)
          }
        })
      })
    })

    it('should invalidate respecting dependency order 1', () => new Promise((resolve, reject) => {
      const { A, B } = makeTestGraph()

      query({ A, B }, { token: 'lol' })

      setTimeout(() => {
        try {
          expect(B.childNodes.B_finalFetch.fetch.cache.map.size).toBe(1);
          expect(A.fetch.cache.map.size).toBe(1);

          invalidate({ B, A }, { token: 'lol' }) // invalidate

          expect(B.childNodes.B_finalFetch.fetch.cache.map.size).toBe(0);
          expect(A.fetch.cache.map.size).toBe(0);

          resolve()
        } catch (err) {
          reject(err)
        }
      }, 5)
    }))

    it('should invalidate respecting dependency order 2', () => new Promise((resolve, reject) => {
      const { A, B } = makeTestGraph()

      query({ A, B }, { token: 'lol' })

      setTimeout(() => {
        try {
          expect(B.childNodes.B_finalFetch.fetch.cache.map.size).toBe(1);
          expect(A.fetch.cache.map.size).toBe(1);

          invalidate({ A, B }, { token: 'lol' }) // invalidate

          expect(B.childNodes.B_finalFetch.fetch.cache.map.size).toBe(0);
          expect(A.fetch.cache.map.size).toBe(0);

          resolve()
        } catch (err) {
          reject(err)
        }
      }, 5)
    }))

  })

})
