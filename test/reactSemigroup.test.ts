import * as fc from 'fast-check';
import { semigroup } from 'fp-ts-laws';
import { getSetoid, success, loading, failure } from '../src/QueryResult';
import { setoidString, setoidNumber } from 'fp-ts/lib/Setoid';
import { getQueryResult } from './QueryResultArbitrary';
import {
  keepQueryResultSemigroup,
  lastQueryResultSemigroup
} from '../src/react';

describe('keepQueryResultSemigroup', () => {
  it('Semigroup', () =>
    semigroup(
      keepQueryResultSemigroup<string, number>(),
      getSetoid(setoidString, setoidNumber),
      getQueryResult(fc.string(), fc.integer())
    ));

  it('should keep the latest Success or Failure', () => {
    const S = keepQueryResultSemigroup<string, number>();
    expect(S.concat(success(1, false), loading)).toEqual(success(1, true));
    expect(S.concat(success(1, false), success(2, false))).toEqual(
      success(2, false)
    );
    expect(S.concat(failure('a', false), loading)).toEqual(failure('a', true));
    expect(S.concat(failure('a', false), failure('b', false))).toEqual(
      failure('b', false)
    );
  });
});

describe('lastQueryResultSemigroup', () => {
  it('Semigroup', () =>
    semigroup(
      lastQueryResultSemigroup<string, number>(),
      getSetoid(setoidString, setoidNumber),
      getQueryResult(fc.string(), fc.integer())
    ));

  it('should discard previous results', () => {
    const S = lastQueryResultSemigroup<string, number>();
    expect(S.concat(success(1, false), loading)).toEqual(loading);
    expect(S.concat(success(1, false), failure('a', false))).toEqual(
      failure('a', false)
    );
    expect(S.concat(failure('a', false), loading)).toEqual(loading);
  });
});
