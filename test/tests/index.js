import t from 'tcomb';
import expect from 'expect';
import sinon from 'sinon';

require('../../src/util');
import queries from '../../fixtures/queries';
import m from '../../fixtures/models';
import assert from 'better-assert';
import Query from '../../src/Query';
import * as avenger from '../../src';

describe('Query', () => {
  it('should have the right structure', () => {
    const q1 = new Query({
      name: 'q1',
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
      name: 'q2',
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
    queries.API.fetchWorklist = sinon.stub().withArgs('a1').returns(Promise.resolve(new m.Worklist({
      _id: 'a1',
      name: 'b2'
    })));
    const worklistPromise = queries.worklistQuery.fetch('a1')();
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
      testKindIds: ["asdf", "qwer"]
    });
  });
});

describe('avenger', () => {
  it('should correctly compute the upset and actualize params', () => {
    const input = new avenger.AvengerInput([
      {
        query: queries.sampleTestsKindQuery
      },
      {
        query: queries.sampleQuery,
        params: new queries.sampleQuery.paramsType({
          sampleId: '123'
        })
      }
    ]);
    const upset = avenger.upset(input);
    expect(upset.map((x) => x.name)).toEqual(
        [ 'sampleTestsKindQuery', 'sampleTestsQuery', 'sampleQuery' ]);

    // TODO: check actualizeParameters
    console.log(avenger.actualizeParameters(input));
  });

  it('should schedule fetchers correctly', (done) => {
    const input = new avenger.AvengerInput([
      {
        query: queries.sampleTestsKindQuery
      },
      {
        query: queries.sampleQuery,
        params: new queries.sampleQuery.paramsType({
          sampleId: 'a1'
        })
      }
    ]);
    queries.API = {}
    queries.API.fetchSample = sinon.stub().withArgs('a1').returns(Promise.resolve(new m.Sample({
      _id: 'a1',
      valid: false
    })));
    queries.API.fetchTests = sinon.stub().withArgs('a1').returns(Promise.resolve([
      new m.Test({
        _id: 't1',
        blocked: true,
        _testKindId: 'tka'
      }),
      new m.Test({
        _id: 't2',
        blocked: false,
        _testKindId: 'tka'
      }),
      new m.Test({
        _id: 't3',
        blocked: true,
        _testKindId: 'tkb'
      })
    ]));
    queries.API.fetchTestKind = sinon.stub();
    queries.API.fetchTestKind.withArgs('tka').returns(Promise.resolve(new m.TestKind({
      _id: 'tka',
      material: 'blood'
    })));
    queries.API.fetchTestKind.withArgs('tkb').returns(Promise.resolve(new m.TestKind({
      _id: 'tkb',
      material: 'plasma'
    })));
    avenger.schedule(input).then(() =>
      done()
    );
  });
});
