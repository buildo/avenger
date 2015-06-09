'use strict';

const t = require('tcomb');
require('../src/util');

const Query = require('../src/Query');
const assert = require('better-assert');
const m = require('./models');
import { uniq } from 'ramda';

const worklistQuery = new Query({
  name: 'worklistQuery',
  paramsType: t.struct({
    worklistId: t.Str
  }),
  fetchResultType: t.struct({
    worklist: m.Worklist
  }),
  fetch: (params) => () => ({
    worklist: module.exports.API.fetchWorklist(params.worklistId)
  })
});
assert(Query.is(worklistQuery));

const worklistSamplesQuery = new Query({
  name: 'worklistSamplesQuery',
  paramsType: t.Nil,
  dependencies: [
    {
      query: worklistQuery,
      fetchParams: (wlq) => ({
        worklistId: wlq.worklist._id
      })
    }
  ],
  fetchResultType: t.struct({
    samples: t.list(m.Sample)
  }),
  fetch: () => (wlq) => ({
    samples: module.exports.API.fetchSamples(wlq.worklistId)
  })
});

const sampleQuery = new Query({
  name: 'sampleQuery',
  paramsType: t.struct({
    sampleId: t.Str
  }),
  fetchResultType: t.struct({
    sample: m.Sample
  }),
  fetch: (params) => () => {
    console.log("***** sampleQuery", params);
    const res = {
      sample: module.exports.API.fetchSample(params.sampleId)
    };
    console.log('res', res);
    return res;
  }
});

const sampleTestsQuery = new Query({
  name: 'sampleTestsQuery',
  paramsType: t.Nil,
  dependencies: [
    {
      query: sampleQuery,
      fetchParams: (sq) => ({
        sampleId: sq.sample._id
      })
    }
  ],
  fetchResultType: t.struct({
    tests: t.list(m.Test)
  }),
  fetch: () => (sq) => {
    console.log('**** sampleTestsQuery', sq);
    return {
      tests: module.exports.API.fetchTests(sq.sampleId)
    };
  }
});

const sampleTestsKindQuery = new Query({
  name: 'sampleTestsKindQuery',
  paramsType: t.Nil,
  dependencies: [
    {
      query: sampleTestsQuery,
      fetchParams: (stq) => ({
        testKindIds: uniq(stq.tests.map((test) => test._testKindId))
      })
    }
  ],
  fetchResultType: t.struct({
    testKinds: m.TestKind
  }),
  fetch: () => (stq) => {
    console.log(stq);
    return {
      testKinds: Promise.all(stq.testKindIds.map((id) => module.exports.API.fetchTestKind(id)))
    };
  }
})

module.exports = {
  API: {},
  worklistQuery: worklistQuery,
  worklistSamplesQuery: worklistSamplesQuery,
  sampleQuery: sampleQuery,
  sampleTestsQuery: sampleTestsQuery,
  sampleTestsKindQuery: sampleTestsKindQuery
};
