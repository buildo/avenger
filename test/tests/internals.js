import t from 'tcomb';
import expect from 'expect';
import sinon from 'sinon';
import assign from 'lodash/object/assign';

import { allValues } from '../../src/util';
import queries from '../../fixtures/queries';
import m from '../../fixtures/models';
import assert from 'better-assert';
import { schedule, AvengerInput } from '../../src';
import { scheduleActualized, upset, actualizeParameters } from '../../src/internals';
import AvengerActualizedCache from '../../src/AvengerActualizedCache';

describe('In fixtures', () => {
  it('fetch should be correct', () => {
    const API = {}
    API.fetchWorklist = sinon.stub().withArgs('a1').returns(Promise.resolve(new m.Worklist({
      _id: 'a1',
      name: 'b2'
    })));
    const { worklist } = queries(API);
    const worklistPromise = worklist.fetch('a1')();

    return allValues(worklistPromise).then((w) => {
      expect(w).toEqual({
        worklist: {
          _id: 'a1',
          name: 'b2'
        }
      });
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
    const input = AvengerInput({ queries: [
      {
        query: sampleTestsKind
      },
      {
        query: sample,
        params: new sample.paramsType({
          sampleId: '123'
        })
      }
    ]});
    const up = upset(input).queries;
    expect(up.map(({ query }) => query.id)).toEqual([
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

    const input = AvengerInput({ queries: [
      {
        query: sampleTestKindsMock
      },
      {
        query: sampleMock,
        params: new sampleMock.paramsType({
          sampleId: '123'
        })
      }
    ]});
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

    it('should pass correct data to fetchers', () => {
      const { sampleTestsKind, sample } = queries(API);
      const input = AvengerInput({ queries: [
        {
          query: sampleTestsKind
        },
        {
          query: sample,
          params: new sample.paramsType({
            sampleId: 'a1'
          })
        }
      ]});

      return scheduleActualized(actualizeParameters(input)).then(() => {
        expect(API.fetchSample.calledOnce).toBe(true);
        expect(API.fetchSample.calledWith('a1')).toBe(true);

        expect(API.fetchTests.calledOnce).toBe(true);
        expect(API.fetchTests.calledWith('a1')).toBe(true);

        expect(API.fetchTestKind.calledTwice).toBe(true);
        expect(API.fetchTestKind.calledWith('tka')).toBe(true);
        expect(API.fetchTestKind.calledWith('tkb')).toBe(true);
      });
    });

    it('should output the upset data', () => {
      const { sampleTestsKind, sample } = queries(API);
      const input = AvengerInput({ queries: [
        {
          query: sampleTestsKind
        },
        {
          query: sample,
          params: new sample.paramsType({
            sampleId: 'a1'
          })
        }
      ]});

      return scheduleActualized(actualizeParameters(input)).then(output => {
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
      });
    });

    it('should deal with multiple dependencies', () => {
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
      const input = AvengerInput({ queries: [
        {
          query: cQuery
        }
      ]});

      return scheduleActualized(actualizeParameters(input)).then(output => {
        expect(APIABC.fetchA.calledOnce).toBe(true);
        expect(APIABC.fetchA.calledWith()).toBe(true);

        expect(APIABC.fetchB.calledOnce).toBe(true);
        expect(APIABC.fetchB.calledWith()).toBe(true);

        expect(APIABC.fetchC.calledOnce).toBe(true);
        expect(APIABC.fetchC.calledWith(33, 44)).toBe(true);

        expect(output).toContain({
          aa: { _aid: 33 }
        });
        expect(output).toContain({
          bb: { _bid: 44 }
        });
        expect(output).toContain({
          cc: { _cid: 55 }
        });
      });
    });

    it('should pass implicit state as last positional param to fetchers', () => {
      const API = {}
      API.fetchA = sinon.stub().returns(Promise.resolve({}));
      API.fetchB = sinon.stub().returns(Promise.resolve({}));
      API.fetchC = sinon.stub().returns(Promise.resolve({}));
      const { cQuery } = queries(API);

      const stub = sinon.stub().returns(Promise.resolve({}));
      const cQueryMock = assign({}, cQuery, {
        fetch: () => stub
      });

      const implicitState = { token: 'asd' };
      const input = AvengerInput({
        queries: [{
          query: cQueryMock
        }],
        implicitState
      });

      return schedule(input).then(output => {
        const { args } = stub.getCall(0);
        expect(args[args.length - 1]).toEqual(implicitState);
      });
    });

  });

  describe('cache', () => {

    const getFullCache = () => ({
      'optimisticQ': { value: { optimistic: 'optimisticFoo' }, set: () => {} },
      'manualQ': { value: { manual: 'manualFoo' }, set: () => {} },
      'immutableQ': { value: { immutable: 'immutableFoo' }, set: () => {} }
    });

    const getAPI = () => {
      const API = {};
      API.fetchNoCacheFoo = sinon.stub().returns(Promise.resolve('noCacheFoo'));
      API.fetchOptimisticFoo = sinon.stub().returns(Promise.resolve('optimisticFoo'));
      API.fetchManualFoo = sinon.stub().returns(Promise.resolve('manualFoo'));
      API.fetchImmutableFoo = sinon.stub().returns(Promise.resolve('immutableFoo'));
      API.fetchBar = sinon.stub().returns(Promise.resolve('bar'));
      return API;
    };

    it('should never fetch() immutable and manual if cached', () => {
      const API = getAPI();
      const { cacheDependentQ } = queries(API);
      const input = AvengerInput({ queries: [{
        query: cacheDependentQ
      }] });

      return scheduleActualized(actualizeParameters(input), null, AvengerActualizedCache(getFullCache())).then(output => {
        expect(API.fetchImmutableFoo.notCalled).toBe(true);
        expect(API.fetchManualFoo.notCalled).toBe(true);
      });
    });

    it('should always fetch() noCache', () => {
      const API = getAPI();
      const { cacheDependentQ } = queries(API);
      const input = AvengerInput({ queries: [{
        query: cacheDependentQ
      }] });

      return scheduleActualized(actualizeParameters(input), null, AvengerActualizedCache(getFullCache())).then(output => {
        expect(API.fetchNoCacheFoo.calledOnce).toBe(true);
      });
    });

    it('should always fetch() optimistic even if cached', () => {
      const API = getAPI();
      const { cacheDependentQ } = queries(API);
      const input = AvengerInput({ queries: [{
        query: cacheDependentQ
      }] });

      return scheduleActualized(actualizeParameters(input), null, AvengerActualizedCache(getFullCache())).then(output => {
        expect(API.fetchOptimisticFoo.calledOnce).toBe(true);
      });
    });

    it('should always set() updated cache values for optimistic', () => {
      const API = getAPI();
      const { cacheDependentQ } = queries(API);
      const input = AvengerInput({ queries: [{
        query: cacheDependentQ
      }] });
      const cache = {
        optimisticQ: { set: sinon.stub() }
      };

      return scheduleActualized(actualizeParameters(input), null, AvengerActualizedCache(cache)).then(output => {
        expect(cache.optimisticQ.set.calledOnce).toBe(true);
        expect(cache.optimisticQ.set.calledWith({
          optimistic: 'optimisticFoo'
        })).toBe(true);
      });
    });

    it('should set() updated cache values for immutable queries only once', () => {
      const API = getAPI();
      const { cacheDependentQ } = queries(API);
      const input = AvengerInput({ queries: [{
        query: cacheDependentQ
      }] });
      const cache = {
        immutableQ: {
          set: sinon.stub()
        }
      };

      return new Promise(resolve => {
        scheduleActualized(actualizeParameters(input), null, AvengerActualizedCache(cache)).then(() => {

          expect(cache.immutableQ.set.calledOnce).toBe(true);
          const fetchResult = { immutable: 'immutableFoo' };
          expect(cache.immutableQ.set.calledWith(fetchResult)).toBe(true);
          cache.immutableQ.value = fetchResult;

        }).then(() => {
          scheduleActualized(actualizeParameters(input), AvengerActualizedCache(cache)).then(() => {

            expect(cache.immutableQ.set.calledOnce).toBe(true);

            resolve();
          });
        });
      });
    });

    it('should never set() updated cache values for noCache', () => {
      const API = getAPI();
      const { cacheDependentQ } = queries(API);
      const input = AvengerInput({ queries: [{
        query: cacheDependentQ
      }] });
      const cache = {
        noCacheQ: {
          set: sinon.stub()
        }
      };

      return scheduleActualized(actualizeParameters(input), null, AvengerActualizedCache(cache)).then(() => {
        expect(cache.noCacheQ.set.notCalled).toBe(true);
      });
    });

    it('should set() updated cache values for manual only if not cached', () => {
      const API = getAPI();
      const { cacheDependentQ } = queries(API);
      const input = AvengerInput({ queries: [{
        query: cacheDependentQ
      }] });
      const cache = {
        manualQ: {
          set: sinon.stub()
        }
      };

      return new Promise(resolve => {
        scheduleActualized(actualizeParameters(input), null, AvengerActualizedCache(cache)).then(() => {

          expect(cache.manualQ.set.calledOnce).toBe(true);
          const fetchResult = { manual: 'manualFoo' };
          expect(cache.manualQ.set.calledWith(fetchResult)).toBe(true);
          cache.manualQ.value = fetchResult;

        }).then(() => {
          scheduleActualized(actualizeParameters(input), null, AvengerActualizedCache(cache)).then(() => {

            expect(cache.manualQ.set.calledOnce).toBe(true);

            resolve();
          });
        });
      });
    });

  });

});
