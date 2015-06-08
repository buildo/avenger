'use strict';

const t = require('tcomb');

const queries = require('../fixtures/queries');
const assert = require('better-assert');
const Query = require('../src/Query');

describe('Query', () => {
  it('should have the right structure', () => {
    const q1 = new Query({
      paramsType: t.struct({
        orderId: t.Num
      }),
      fetchResultType: t.struct({
        order: t.Any
      }),
      fetch: (params) => () => ({
        order: null
      })
    });
    const q2 = new Query({
      paramsType: t.struct({
        id: t.Num
      }),
      fetchResultType: t.struct({
        result: t.Any
      }),
      dependencies: [
        {
          query: q1,
          fetchParams: (q1) => ({
            a: 'a'
          }),
          multi: 'p1'
        }
      ],
      fetch: (params) => (q1) => ({
        result: q1.a
      })
    });
    assert(Query.is(q1));
    assert(Query.is(q2));
  });
});

describe('Fixture', () => {
  it('should be processed correctly', () => {
    console.log(queries.sampleQuery);
  });
});
//const sampleDetailTests = {
//  dependencies: {
//    sampleDetail: {
//      params: ({ tests }) => ({
//        testId: tests.map(({ _id }) => _id)
//      }),
//      multi: 'testId'
//    }
//  },
//
//  fetch: () => ({ testId }) => ({
//    testRemarks: API.fetchTestRemark({ testId })
//  })
//}
