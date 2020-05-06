import * as fc from 'fast-check';
import { QueryResult, loading, failure, success } from '../src/QueryResult';

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

export function getQueryResult<L, A>(
  leftArb: fc.Arbitrary<L>,
  rightArb: fc.Arbitrary<A>
): fc.Arbitrary<QueryResult<L, A>> {
  return fc.oneof<fc.Arbitrary<QueryResult<L, A>>[]>(
    getLoading(rightArb),
    getFailure(leftArb),
    getSuccess(rightArb)
  );
}
