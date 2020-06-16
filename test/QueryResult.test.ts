import * as fc from 'fast-check';
import * as laws from 'fp-ts-laws';
import * as QR from '../src/QueryResult';
import * as Eq from 'fp-ts/lib/Eq';
import { getQueryResult } from './QueryResultArbitrary';

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
