// import * as assert from 'assert'
// import 'rxjs'

// import { none, some } from 'fp-ts/lib/Option'
// import {
//   Leaf,
//   ObservableCache,
//   available,
//   concat
// } from '../src'

// describe('concat', () => {

//   it('should merge both inputs and payloads', () => {
//     const cache1 = new ObservableCache<{ a1: string }, { p1: number }>()
//     const fetch1 = (a: { a1: string }) => Promise.resolve({ p1: 2 * a.a1.length })
//     const leaf1 = new Leaf(fetch1, available, cache1)
//     const cache2 = new ObservableCache<{ a2: number }, { p2: boolean }>()
//     const fetch2 = (a: { a2: number }) => Promise.resolve({ p2: a.a2 > 0 })
//     const leaf2 = new Leaf(fetch2, available, cache2)
//     const all = concat([leaf1, leaf2])
//     const observable = all.observe({ a1: 'hello', a2: 2 })
//     return new Promise((resolve, reject) => {
//       observable.bufferTime(10).take(1).subscribe(events => {
//         try {
//           assert.deepEqual(events, [
//             { loading: true, data: none },
//             { loading: false, data: some({ p1: 10, p2: true }) },
//           ])
//           resolve()
//         } catch (e) {
//           reject(e)
//         }
//       })
//       all.run({ a1: 'hello', a2: 2 })
//     })
//   })

// })
