// import expect from 'expect';
// import AvengerCache from '../../src/AvengerCache';
// import { hashedParams } from '../../src/AvengerCache';

// const fixtureState = {
//   myId: {
//     'foo.eee:bar': 42,
//     'foo.ooo:baz': 101
//   },
//   optimisticQ: {
//     '∅': { optimistic: 'optimisticFoo' }
//   },
//   manualQ: {
//     '∅': { manual: 'manualFoo' }
//   }
// };

// describe('AvengerCache', () => {

//   describe('hashedParams', () => {

//     it('should work for AllowedParams', () => {
//       const hashed = hashedParams({
//         q2: { c: 'foo', b: 42.1 },
//         q1: { a: true }
//       });
//       expect(hashed).toBe('q1.a:true-q2.b:42.1-q2.c:foo');
//     });

//     it('should be sort of deterministic', () => {
//       expect(hashedParams({
//         q2: { c: 'foo', b: 42.1 },
//         q1: { a: true }
//       })).toBe(hashedParams({
//         q2: { c: 'foo', b: 42.1 },
//         q1: { a: true }
//       }));
//     });

//   });

//   it('should accept an initial state', () => {
//     const cache = new AvengerCache(fixtureState);

//     expect(cache.get('myId', { foo: { eee: 'bar' } })).toBe(42);
//     expect(cache.get('myId', { foo: { ooo: 'baz' } })).toBe(101);
//   });

//   it('should be serializable', () => {
//     expect(new AvengerCache(fixtureState).toJSON()).toEqual(fixtureState);
//   });

// });
