import expect from 'expect';
import sinon from 'sinon';
import Avenger, { QuerySet } from '../../src';
import queries from '../../fixtures/queries';

describe('Avenger', () => {

  const API = {
    fetchWorklist: (_id) => Promise.resolve({ worklist: { _id } }),
    fetchSamples: () => Promise.resolve({ samples: [] })
  };

  it('should be instantiable and accept valid queries set', () => {
    const { worklist } = queries(API);
    const av = new Avenger({ worklist });

    expect(av).toBeAn(Avenger);
  });

  describe('QuerySet', () => {
    const { worklist, worklistSamples } = queries(API);
    const av = new Avenger({ worklist, worklistSamples });
    const qsInput = { queries: { worklistSamples }, state: { worklistId: 'foo' } };

    it('should be created given a valid input', () => {
      const qs = av.querySet(qsInput);

      expect(qs).toBeAn(QuerySet);
    });

    it('should be run()able and return a Promise', () => {
      const qs = av.querySet(qsInput);

      expect(qs.run()).toBeAn(Promise);
    });

    it('should resolve the run() promise with the entire data set', () => {
      const qs = av.querySet(qsInput);

      return qs.run().then(data => {
        expect(data).toEqual({ worklistSamples: { samples: { samples: [] } } });
      });
    });

    it('should emit change events, at least 2', () => {
      const qs = av.querySet(qsInput);
      const spy = sinon.spy();
      qs.on('change', spy);

      return qs.run().then(() => {
        expect(spy.callCount).toBeGreaterThan(1);
      });
    });

  });

  describe('QuerySet with cache', () => {
    const { immutableQ, manualQ, optimisticQ, noCacheQ, cacheDependentQ } = queries({
      fetchImmutableFoo: () => Promise.resolve({ immutable: 'immutableFoo' }),
      fetchManualFoo: () => Promise.resolve({ manual: 'manualFoo' }),
      fetchOptimisticFoo: () => Promise.resolve({ optimistic: 'optimisticFoo' }),
      fetchNoCacheFoo: () => Promise.resolve({ noCache: 'noCacheFoo' }),
      fetchBar: () => Promise.resolve({})
    });
    const cacheInit = {
      immutableQ: { '∅': { immutable: 'immutableFoo' } },
      manualQ: { '∅': { manual: 'manualFoo' } },
      optimisticQ: { '∅': { optimistic: 'optimisticFoo' } }
    };
    const av = new Avenger({ immutableQ, manualQ, optimisticQ, noCacheQ, cacheDependentQ }, cacheInit);
    const qsInput = { queries: { cacheDependentQ }, state: {} };

    it('first change event should contain cached values for the QS', () => {
      const qs = av.querySet(qsInput);
      const stub = sinon.stub();
      qs.on('change', stub);

      return qs.run().then(() => {
        expect(stub.callCount).toBeGreaterThan(1);
        expect(stab.getCall(0).args).toEqual({
          immutableQ: { immutable: 'immutableFoo' },
          manualQ: { manual: 'manualFoo' },
          optimisticQ: { optimistic: 'optimisticFoo' }
        });
      });
    });
  });

});
