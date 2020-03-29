import * as fc from 'fast-check';
import * as laws from 'fp-ts-laws';
import * as QR from '../src/QueryResult';
import * as Eq from 'fp-ts/lib/Eq';

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

function getQueryResult<L, A>(
  leftArb: fc.Arbitrary<L>,
  rightArb: fc.Arbitrary<A>
): fc.Arbitrary<QR.QueryResult<L, A>> {
  return fc.oneof<fc.Arbitrary<QR.QueryResult<L, A>>[]>(
    getLoading(rightArb),
    getFailure(leftArb),
    getSuccess(rightArb)
  );
}

describe('QueryResult', () => {
  it('Functor', () => {
    laws.functor(QR.queryResult)(
      a => getQueryResult(fc.string(), a),
      Eqa => QR.getEq(Eq.eqString, Eqa)
    );
  });

  it('Apply', () => {
    laws.apply(QR.queryResult)(
      a => getQueryResult(fc.string(), a),
      Eqa => QR.getEq(Eq.eqString, Eqa)
    );
  });

  it('Applicative', () => {
    laws.applicative(QR.queryResult)(
      a => getQueryResult(fc.string(), a),
      Eqa => QR.getEq(Eq.eqString, Eqa)
    );
  });

  it('Monad', () => {
    laws.monad(QR.queryResult)(Eqa => QR.getEq(Eq.eqString, Eqa));
  });
});
