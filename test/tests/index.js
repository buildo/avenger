import t from 'tcomb';
import expect from 'expect';
import sinon from 'sinon';

require('../../src/util');
import queries from '../../fixtures/queries';
import m from '../../fixtures/models';
import assert from 'better-assert';
import Query from '../../src/Query';

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

describe('Promise.allValues', () => {
  it('should do its magic', (done) => {
    Promise.allValues({
      asdf: Promise.resolve(12),
      qwer: Promise.resolve(24)
    }).then((res) => {
      expect(res).toEqual({
        asdf: 12,
        qwer: 24
      });
      done();
    });
  });
});

describe('In fixtures', () => {
  it('fetch should be correct', (done) => {
    queries.API = {}
    queries.API.fetchWorklist = sinon.stub().withArgs(12).returns(Promise.resolve(new m.Worklist({
      _id: 'a1',
      name: 'b2'
    })));
    const worklistPromise = queries.worklistQuery.fetch(12)();
    Promise.allValues(worklistPromise).then((w) => {
      expect(w).toEqual({
        worklist: {
          _id: 'a1',
          name: 'b2'
        }
      });
      done();
    });
  });

  it('dependencies should be correct', () => {
    const sampleTestsResult = {
      tests: [
        new m.Test({
          _id: "a1",
          blocked: false,
          _testKindId: "asdf"
        }),
        new m.Test({
          _id: "b2",
          blocked: true,
          _testKindId: "qwer"
        })
      ]
    }
    const sampleTestsKindFetchParams =
      queries.sampleTestsKindQuery.dependencies[0].fetchParams(sampleTestsResult);
    expect(sampleTestsKindFetchParams).toEqual({
      testKindId: ["asdf", "qwer"]
    });
  });
});
