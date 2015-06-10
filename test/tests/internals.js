import t from 'tcomb';
import expect from 'expect';
import sinon from 'sinon';
import assign from 'lodash/object/assign';

import { allValues } from '../../src/util';
import queries from '../../fixtures/queries';
import m from '../../fixtures/models';
import assert from 'better-assert';
import Query from '../../src/Query';
import { schedule, AvengerInput } from '../../src';
import { upset, actualizeParameters } from '../../src/internals';

describe('Query', () => {
  it('should have the right structure', () => {
    const q1 = new Query({
      id: 'q1',
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
      id: 'q2',
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

describe('allValues', () => {
  it('should do its magic', done => {
    allValues({
      asdf: Promise.resolve(12),
      qwer: Promise.resolve(24)
    }).then((res) => {
      expect(res).toEqual({
        asdf: 12,
        qwer: 24
      });
      done();
    }).catch(e => { throw e });
  });
});

describe('In fixtures', () => {
  it('fetch should be correct', (done) => {
    const API = {}
    API.fetchWorklist = sinon.stub().withArgs('a1').returns(Promise.resolve(new m.Worklist({
      _id: 'a1',
      name: 'b2'
    })));
    const { worklist } = queries(API);
    const worklistPromise = worklist.fetch('a1')();

    allValues(worklistPromise).then((w) => {
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
    const { sampleTestsKind } = queries({});
    const sampleTestsKindFetchParams = sampleTestsKind.dependencies[0].fetchParams(sampleTestsResult);
    expect(sampleTestsKindFetchParams).toEqual({
      testKindIds: ["asdf", "qwer"]
    });
  });
});

describe('avenger', () => {
  it('should correctly compute the upset', () => {
    const { sample, sampleTestsKind } = queries({});
    const input = AvengerInput([
      {
        query: sampleTestsKind
      },
      {
        query: sample,
        params: new sample.paramsType({
          sampleId: '123'
        })
      }
    ]);
    const up = upset(input);
    expect(up.map(({ id }) => id)).toEqual([
      'sampleTestsKind', 'sampleTests', 'sample' ]);
  });

  it('should correctly actualize parameters', () => {
    const { sampleTestsKind, sample } = queries({});
    const sampleTestKindsMock = assign({}, sampleTestsKind, {
      fetch: sinon.spy()
    });
    const sampleMock = assign({}, sample, {
      fetch: sinon.spy()
    });

    const input = AvengerInput([
      {
        query: sampleTestKindsMock
      },
      {
        query: sampleMock,
        params: new sampleMock.paramsType({
          sampleId: '123'
        })
      }
    ]);
    actualizeParameters(input);

    expect(sampleTestKindsMock.fetch.calledOnce).toBe(true);
    expect(sampleMock.fetch.calledOnce).toBe(true);
    expect(sampleMock.fetch.calledWith({ sampleId: '123' })).toBe(true);
  });

  describe('data dependencies', () => {
    const API = {}
    API.fetchSample = sinon.stub().withArgs('a1').returns(Promise.resolve(new m.Sample({
      _id: 'a1',
      valid: false
    })));
    API.fetchTests = sinon.stub().withArgs('a1').returns(Promise.resolve([
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
    API.fetchTestKind = sinon.stub();
    API.fetchTestKind.withArgs('tka').returns(Promise.resolve(new m.TestKind({
      _id: 'tka',
      material: 'blood'
    })));
    API.fetchTestKind.withArgs('tkb').returns(Promise.resolve(new m.TestKind({
      _id: 'tkb',
      material: 'plasma'
    })));

    it('should pass correct data to fetchers', done => {
      const { sampleTestsKind, sample } = queries(API);
      const input = AvengerInput([
        {
          query: sampleTestsKind
        },
        {
          query: sample,
          params: new sample.paramsType({
            sampleId: 'a1'
          })
        }
      ]);

      schedule(input).then(() => {
        expect(API.fetchSample.calledOnce).toBe(true);
        expect(API.fetchSample.calledWith('a1')).toBe(true);

        expect(API.fetchTests.calledOnce).toBe(true);
        expect(API.fetchTests.calledWith('a1')).toBe(true);

        expect(API.fetchTestKind.calledTwice).toBe(true);
        expect(API.fetchTestKind.calledWith('tka')).toBe(true);
        expect(API.fetchTestKind.calledWith('tkb')).toBe(true);

        done();
      });
    });

    it('should output the upset data', done => {
      const { sampleTestsKind, sample } = queries(API);
      const input = AvengerInput([
        {
          query: sampleTestsKind
        },
        {
          query: sample,
          params: new sample.paramsType({
            sampleId: 'a1'
          })
        }
      ]);

      schedule(input).then(output => {
        expect(output.length).toBe(3);
        expect(output).toContain({
          sample: { _id: 'a1', valid: false }
        });
        expect(output).toContain({
          tests: [true, true, true]
        }, (a, b) => assert(a.tests.length === b.tests.length));
        expect(output).toContain({
          testKinds: [true, true]
        }, (a, b) => assert(a.testKinds.length === b.testKinds.length));

        done();
      });
    });

    it('should deal with multiple dependencies', done => {
      const APIABC = {}
      APIABC.fetchA = sinon.stub().returns(Promise.resolve({
        _aid: 33
      }));
      APIABC.fetchB = sinon.stub().returns(Promise.resolve({
        _bid: 44
      }));
      APIABC.fetchC = sinon.stub().withArgs(33, 44).returns(Promise.resolve({
        _cid: 55
      }));
      const { cQuery } = queries(APIABC);
      const input = AvengerInput([
        {
          query: cQuery
        }
      ]);
      schedule(input).then(output => {
        expect(APIABC.fetchA.calledOnce).toBe(true);
        expect(APIABC.fetchA.calledWith()).toBe(true);

        expect(APIABC.fetchB.calledOnce).toBe(true);
        expect(APIABC.fetchB.calledWith()).toBe(true);

        expect(APIABC.fetchC.calledOnce).toBe(true);
        expect(APIABC.fetchC.calledWith(33, 44)).toBe(true);

        console.dir(output);
        expect(output).toContain({
          aa: { _aid: 33 }
        });
        expect(output).toContain({
          bb: { _bid: 44 }
        });
        expect(output).toContain({
          cc: { _cid: 55 }
        });

        done();
      }).catch(e => console.log(e));
    });

  });

});
