import * as fc from 'fast-check';
import { applicative } from 'fp-ts-laws';
import {
  queryResult,
  QueryResult,
  loading,
  failure,
  success,
  getSetoid
} from '../src/QueryResult';
import { setoidString } from 'fp-ts/lib/Setoid';

function getLoading<L, A>(
  arb: fc.Arbitrary<unknown>
): fc.Arbitrary<QueryResult<L, A>> {
  return arb.map(() => loading);
}

function getFailure<L, A>(
  arb: fc.Arbitrary<L>
): fc.Arbitrary<QueryResult<L, A>> {
  return arb.chain(a => fc.boolean().map(loading => failure(a, loading)));
}

function getSuccess<L, A>(
  arb: fc.Arbitrary<A>
): fc.Arbitrary<QueryResult<L, A>> {
  return arb.chain(a => fc.boolean().map(loading => success(a, loading)));
}

function getQueryResult<L, A>(
  leftArb: fc.Arbitrary<L>,
  rightArb: fc.Arbitrary<A>
): fc.Arbitrary<QueryResult<L, A>> {
  return fc.oneof(
    getLoading(rightArb),
    getFailure(leftArb),
    getSuccess(rightArb)
  );
}

describe('QueryResult', () => {
  it('Applicative', () => {
    applicative(
      queryResult,
      a => getQueryResult(fc.string(), a),
      Sa => getSetoid(setoidString, Sa)
    );
  });
});
