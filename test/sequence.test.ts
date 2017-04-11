// import * as assert from 'assert'
// import 'rxjs'

// import { none, some } from 'fp-ts/lib/Option'
// import {
//   Leaf,
//   ObservableCache,
//   available,
//   sequence
// } from '../src'

// describe('sequence', () => {

//   it('should return an observable of dictionaries', () => {
//     const cache1 = new ObservableCache<number, number>()
//     const fetch1 = (a: number) => Promise.resolve(2 * a)
//     const leaf1 = Leaf.create(fetch1, available, cache1)

//     const cache2 = new ObservableCache<string, string>()
//     const fetch2 = (a: string) => Promise.resolve(`hello ${a}`)
//     const leaf2 = Leaf.create(fetch2, available, cache2)

//     const observable = sequence({
//       n: leaf1,
//       s: leaf2
//     }, {
//       n: 1,
//       s: 's'
//     })
//     return new Promise((resolve, reject) => {
//       observable.bufferTime(10).take(1).subscribe(events => {
//         try {
//           assert.deepEqual(events, [
//             {
//               n: { loading: true, data: none },
//               s: { loading: true, data: none }
//             },
//             {
//               n: { loading: false, data: some(2) },
//               s: { loading: true, data: none }
//             },
//             {
//               n: { loading: false, data: some(2) },
//               s: { loading: false, data: some('hello s') }
//             }
//           ])
//           resolve()
//         } catch (e) {
//           reject(e)
//         }
//       })
//     })
//   })

// })
