'use strict';

const t = require('tcomb');
require('../src/util');

const Query = require('../src/Query');
const assert = require('better-assert');
const m = require('./models');
import uniq from 'lodash/array/uniq';

export default function(API) {

  const worklistQuery = new Query({
    name: 'worklistQuery',
    paramsType: t.struct({
      worklistId: t.Str
    }),
    fetchResultType: t.struct({
      worklist: m.Worklist
    }),
    fetch: ({ worklistId }) => () => ({
      worklist: API.fetchWorklist(worklistId)
    })
  });

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
      samples: API.fetchSamples(wlq.worklistId)
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
    fetch: ({ sampleId }) => () => {
      console.log("***** sampleQuery", { sampleId });
      const res = {
        sample: API.fetchSample(sampleId)
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
        tests: API.fetchTests(sq.sampleId)
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
      console.log('>> stq', stq);
      return {
        testKinds: Promise.all(stq.testKindIds.map(id => API.fetchTestKind(id)))
      };
    }
  });

  return {
    worklistQuery,
    worklistSamplesQuery,
    sampleQuery,
    sampleTestsQuery,
    sampleTestsKindQuery
  };
}
