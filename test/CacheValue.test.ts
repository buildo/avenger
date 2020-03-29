import * as fc from 'fast-check';
import { functor } from 'fp-ts-laws';
import * as Eq from 'fp-ts/lib/Eq';
import { left, right } from 'fp-ts/lib/Either';
import * as CV from '../src/CacheValue';

function getInitial<L, A>(
  arb: fc.Arbitrary<unknown>
): fc.Arbitrary<CV.CacheValue<L, A>> {
  return arb.map(() => CV.cacheValueInitial);
}

function getPending<L, A>(
  leftArb: fc.Arbitrary<L>,
  rightArb: fc.Arbitrary<A>
): fc.Arbitrary<CV.CacheValue<L, A>> {
  return fc.oneof<fc.Arbitrary<CV.CacheValue<L, A>>[]>(
    leftArb.map(l =>
      CV.cacheValuePending(Promise.resolve(left(l)), new Date())
    ),
    rightArb.map(r =>
      CV.cacheValuePending(Promise.resolve(right(r)), new Date())
    )
  );
}

function getError<L, A>(
  arb: fc.Arbitrary<L>
): fc.Arbitrary<CV.CacheValue<L, A>> {
  return arb.map(a => CV.cacheValueError(a, new Date()));
}

function getResolved<L, A>(
  arb: fc.Arbitrary<A>
): fc.Arbitrary<CV.CacheValue<L, A>> {
  return arb.map(a => CV.cacheValueResolved(a, new Date()));
}

function getCacheValue<L, A>(
  leftArb: fc.Arbitrary<L>,
  rightArb: fc.Arbitrary<A>
): fc.Arbitrary<CV.CacheValue<L, A>> {
  return fc.oneof<fc.Arbitrary<CV.CacheValue<L, A>>[]>(
    getInitial(rightArb),
    getPending(leftArb, rightArb),
    getError(leftArb),
    getResolved(rightArb)
  );
}

describe('CacheValue', () => {
  it('Functor', () => {
    functor(CV.cacheValue)(
      a => getCacheValue(fc.string(), a),
      Eqa => CV.getEq(Eq.eqString, Eqa)
    );
  });
});
