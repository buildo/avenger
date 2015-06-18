import t from 'tcomb';
import uniq from 'lodash/array/uniq';
import identity from 'lodash/utility/identity';

import Query from '../src/Query';
import m from './models';

export default function(API) {

  const worklist = new Query({
    id: 'worklist',
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

  const worklistSamples = new Query({
    id: 'worklistSamples',
    paramsType: t.Nil,
    dependencies: [
      {
        query: worklist,
        fetchParams: ({ worklist }) => ({
          worklistId: worklist._id
        })
      }
    ],
    fetchResultType: t.struct({
      samples: t.list(m.Sample)
    }),
    fetch: () => ({ worklistId }) => ({
      samples: API.fetchSamples(worklistId)
    })
  });

  const sample = new Query({
    id: 'sample',
    paramsType: t.struct({
      sampleId: t.Str
    }),
    fetchResultType: t.struct({
      sample: m.Sample
    }),
    fetch: ({ sampleId }) => () => ({
      sample: API.fetchSample(sampleId)
    })
  });

  const sampleTests = new Query({
    id: 'sampleTests',
    paramsType: t.Nil,
    dependencies: [
      {
        query: sample,
        fetchParams: ({ sample }) => ({
          sampleId: sample._id
        })
      }
    ],
    fetchResultType: t.struct({
      tests: t.list(m.Test)
    }),
    fetch: () => ({ sampleId }) => ({
      tests: API.fetchTests(sampleId)
    })
  });

  const sampleTestsKind = new Query({
    id: 'sampleTestsKind',
    paramsType: t.Nil,
    dependencies: [
      {
        query: sampleTests,
        fetchParams: ({ tests }) => ({
          testKindIds: uniq(tests.map((test) => test._testKindId))
        })
      }
    ],
    fetchResultType: t.struct({
      testKinds: m.TestKind
    }),
    fetch: () => ({ testKindIds }) => ({
      testKinds: Promise.all(testKindIds.map(id => API.fetchTestKind(id)))
    })
  });

  //   A   B
  //    \ /
  //     C
  const aQuery = new Query({
    id: 'a',
    paramsType: t.Nil,
    fetchResultType: t.struct({
      aa: t.struct({
        _aid: t.Str
      })
    }),
    fetch: () => () => ({
      aa: API.fetchA()
    })
  });

  const bQuery = new Query({
    id: 'b',
    paramsType: t.Nil,
    fetchResultType: t.struct({
      bb: t.struct({
        _bid: t.Str
      })
    }),
    fetch: () => () => ({
      bb: API.fetchB()
    })
  });

  const cQuery = new Query({
    id: 'c',
    paramsType: t.Nil,
    dependencies: [
      {
        query: aQuery,
        fetchParams: ({ aa }) => ({
          aid: aa._aid
        })
      },
      {
        query: bQuery,
        fetchParams: ({ bb }) => ({
          bid: bb._bid
        })
      }
    ],
    fetchResultType: t.struct({
      cc: t.struct({
        _cid: t.Str
      })
    }),
    fetch: () => ({ aid }, { bid }) => ({
      cc: API.fetchC(aid, bid)
    })
  });

  const noCacheQ = new Query({
    id: 'noCacheQ',
    paramsType: t.Nil,
    fetchResultType: t.struct({
      noCache: t.Str
    }),
    fetch: () => () => ({
      noCache: API.fetchNoCacheFoo()
    })
  });

  const optimisticQ = new Query({
    id: 'optimisticQ',
    paramsType: t.Nil,
    cache: 'optimistic',
    fetchResultType: t.struct({
      optimistic: t.Str
    }),
    fetch: () => () => ({
      optimistic: API.fetchOptimisticFoo()
    })
  });

  const manualQ = new Query({
    id: 'manualQ',
    paramsType: t.Nil,
    cache: 'manual',
    fetchResultType: t.struct({
      manual: t.Str
    }),
    fetch: () => () => ({
      manual: API.fetchManualFoo()
    })
  });

  const immutableQ = new Query({
    id: 'immutableQ',
    paramsType: t.Nil,
    cache: 'immutable',
    fetchResultType: t.struct({
      immutable: t.Str
    }),
    fetch: () => () => ({
      immutable: API.fetchImmutableFoo()
    })
  });

  const cacheDependentQ = new Query({
    id: 'cacheDependentQ',
    paramsType: t.Nil,
    dependencies: [{
      query: immutableQ,
      fetchParams: identity
    }, {
      query: manualQ,
      fetchParams: identity
    }, {
      query: optimisticQ,
      fetchParams: identity
    }, {
      query: noCacheQ,
      fetchParams: identity
    }],
    fetchResultType: t.struct({
      bar: t.Str
    }),
    fetch: () => ({ immutable }, { manual }, { optimistic }, { noCache }) => ({
      bar: API.fetchBar(immutable, manual, optimistic, noCache)
    })
  });

  return {
    worklist,
    worklistSamples,
    sample,
    sampleTests,
    sampleTestsKind,

    aQuery,
    bQuery,
    cQuery,

    noCacheQ,
    optimisticQ,
    manualQ,
    immutableQ,
    cacheDependentQ
  };
}
