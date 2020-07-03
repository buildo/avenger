import * as fc from 'fast-check';
import { semigroup } from 'fp-ts-laws';
import * as QR from '../src/QueryResult';
import * as Eq from 'fp-ts/lib/Eq';
import { getQueryResult } from './QueryResultArbitrary';
import {
  keepQueryResultSemigroup,
  lastQueryResultSemigroup
} from '../src/react';

describe('keepQueryResultSemigroup', () => {
  it('Semigroup', () =>
    semigroup(
      keepQueryResultSemigroup<string, number>(),
      QR.getEq(Eq.eqString, Eq.eqNumber),
      getQueryResult(fc.string(), fc.integer())
    ));

  it('should keep the latest Success or Failure', () => {
    const S = keepQueryResultSemigroup<string, number>();
    expect(
      S.concat(QR.queryResultSuccess(1, false), QR.queryResultLoading)
    ).toEqual(QR.queryResultSuccess(1, true));
    expect(
      S.concat(QR.queryResultSuccess(1, false), QR.queryResultSuccess(2, false))
    ).toEqual(QR.queryResultSuccess(2, false));
    expect(
      S.concat(QR.queryResultFailure('a', false), QR.queryResultLoading)
    ).toEqual(QR.queryResultFailure('a', true));
    expect(
      S.concat(
        QR.queryResultFailure('a', false),
        QR.queryResultFailure('b', false)
      )
    ).toEqual(QR.queryResultFailure('b', false));
  });
});

describe('lastQueryResultSemigroup', () => {
  it('Semigroup', () =>
    semigroup(
      lastQueryResultSemigroup<string, number>(),
      QR.getEq(Eq.eqString, Eq.eqNumber),
      getQueryResult(fc.string(), fc.integer())
    ));

  it('should discard previous results', () => {
    const S = lastQueryResultSemigroup<string, number>();
    expect(
      S.concat(QR.queryResultSuccess(1, false), QR.queryResultLoading)
    ).toEqual(QR.queryResultLoading);
    expect(
      S.concat(
        QR.queryResultSuccess(1, false),
        QR.queryResultFailure('a', false)
      )
    ).toEqual(QR.queryResultFailure('a', false));
    expect(
      S.concat(QR.queryResultFailure('a', false), QR.queryResultLoading)
    ).toEqual(QR.queryResultLoading);
  });
});
