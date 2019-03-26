import * as fc from 'fast-check';
import { functor } from 'fp-ts-laws';
import { setoidString } from 'fp-ts/lib/Setoid';
import { left, right } from 'fp-ts/lib/Either';
import {
  cacheValue,
  getSetoid,
  CacheValue,
  cacheValuePending,
  cacheValueInitial,
  cacheValueError,
  cacheValueResolved
} from '../src/CacheValue';

function getInitial<L, A>(
  arb: fc.Arbitrary<unknown>
): fc.Arbitrary<CacheValue<L, A>> {
  return arb.map(() => cacheValueInitial());
}

function getPending<L, A>(
  leftArb: fc.Arbitrary<L>,
  rightArb: fc.Arbitrary<A>
): fc.Arbitrary<CacheValue<L, A>> {
  return fc.oneof(
    leftArb.map(l => cacheValuePending(Promise.resolve(left(l)), new Date())),
    rightArb.map(r => cacheValuePending(Promise.resolve(right(r)), new Date()))
  );
}

function getError<L, A>(arb: fc.Arbitrary<L>): fc.Arbitrary<CacheValue<L, A>> {
  return arb.map(a => cacheValueError(a, new Date()));
}

function getResolved<L, A>(
  arb: fc.Arbitrary<A>
): fc.Arbitrary<CacheValue<L, A>> {
  return arb.map(a => cacheValueResolved(a, new Date()));
}

function getCacheValue<L, A>(
  leftArb: fc.Arbitrary<L>,
  rightArb: fc.Arbitrary<A>
): fc.Arbitrary<CacheValue<L, A>> {
  return fc.oneof(
    getInitial(rightArb),
    getPending(leftArb, rightArb),
    getError(leftArb),
    getResolved(rightArb)
  );
}

describe('CacheValue', () => {
  it('Functor', () => {
    functor(
      cacheValue,
      a => getCacheValue(fc.string(), a),
      Sa => getSetoid(setoidString, Sa)
    );
  });
});
