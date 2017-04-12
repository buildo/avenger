// import * as assert from 'assert'

// import { none, some } from 'fp-ts/lib/Option'
// import {
//   Leaf,
//   ObservableCache,
//   available,
//   sequenceSync,
//   Done
// } from '../src'

// describe('sequenceSync', () => {

//   it('should return a dictionary even if data is not available', () => {
//     const cache1 = new ObservableCache<number, number>()
//     const fetch1 = (a: number) => Promise.resolve(2 * a)
//     const leaf1 = new Leaf(fetch1, available, cache1)

//     const cache2 = new ObservableCache<string, string>()
//     const fetch2 = (a: string) => Promise.resolve(`hello ${a}`)
//     const leaf2 = new Leaf(fetch2, available, cache2)

//     const dict = sequenceSync({
//       n: leaf1,
//       s: leaf2
//     }, {
//       n: 1,
//       s: 's'
//     })
//     assert.deepEqual(dict, {
//       n: { loading: true, data: none },
//       s: { loading: true, data: none }
//     })
//   })

//   it('should return a dictionary with data if available', () => {
//     const cache1 = new ObservableCache<number, number>()
//     const fetch1 = (a: number) => Promise.resolve(2 * a)
//     const leaf1 = new Leaf(fetch1, available, cache1)

//     const cache2 = new ObservableCache<string, string>()
//     const fetch2 = (a: string) => Promise.resolve(`hello ${a}`)
//     const leaf2 = new Leaf(fetch2, available, cache2)

//     cache1.storeDone(1, new Done(2, Date.now(), Promise.resolve(2)))
//     cache2.storeDone('s', new Done('hello s', Date.now(), Promise.resolve('hello s')))

//     const dict = sequenceSync({
//       n: leaf1,
//       s: leaf2
//     }, {
//       n: 1,
//       s: 's'
//     })
//     assert.deepEqual(dict, {
//       n: { loading: false, data: some(2) },
//       s: { loading: false, data: some('hello s') }
//     })
//   })

// })
