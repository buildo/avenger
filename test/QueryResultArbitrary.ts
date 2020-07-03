import * as fc from 'fast-check';
import * as QR from '../src/QueryResult';

function getLoading<L, A>(
  arb: fc.Arbitrary<unknown>
): fc.Arbitrary<QR.QueryResult<L, A>> {
  return arb.map(() => QR.queryResultLoading);
}

function getFailure<L, A>(
  arb: fc.Arbitrary<L>
): fc.Arbitrary<QR.QueryResult<L, A>> {
  return arb.chain(a =>
    fc.boolean().map(loading => QR.queryResultFailure(a, loading))
  );
}

function getSuccess<L, A>(
  arb: fc.Arbitrary<A>
): fc.Arbitrary<QR.QueryResult<L, A>> {
  return arb.chain(a =>
    fc.boolean().map(loading => QR.queryResultSuccess(a, loading))
  );
}

export function getQueryResult<L, A>(
  leftArb: fc.Arbitrary<L>,
  rightArb: fc.Arbitrary<A>
): fc.Arbitrary<QR.QueryResult<L, A>> {
  return fc.oneof<fc.Arbitrary<QR.QueryResult<L, A>>[]>(
    getLoading(rightArb),
    getFailure(leftArb),
    getSuccess(rightArb)
  );
}
