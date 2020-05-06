import * as fc from 'fast-check';
import { applicative } from 'fp-ts-laws';
import { queryResult, getSetoid } from '../src/QueryResult';
import { setoidString } from 'fp-ts/lib/Setoid';
import { getQueryResult } from './QueryResultArbitrary';

describe('QueryResult', () => {
  it('Applicative', () => {
    applicative(queryResult)(
      a => getQueryResult(fc.string(), a),
      Sa => getSetoid(setoidString, Sa)
    );
  });
});
