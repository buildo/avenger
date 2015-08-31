import expect from 'expect';
import sinon from 'sinon';
import Avenger, { QuerySet } from '../../src';
import queries from '../../fixtures/queries';
import _ from 'lodash';

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

    it('should be run()able from a recipe, skipping minCached queries', () => {
      const api = _.assign({}, API, {
        fetchWorklist: sinon.spy()
      });
      const { worklist, worklistSamples } = queries(api);
      const av = new Avenger({ worklist, worklistSamples });
      const qs = av.querySetFromRecipe({
        queries: { worklistSamples },
        state: { worklistId: 'foo' },
        fetchParams: {
          worklistSamples: {
            worklist: 'foo'
          }
        },
        queriesToSkip: ['worklist']
      });

      return qs.run().then(data => {
        expect(data).toEqual({ worklistSamples: { samples: { samples: [] } } });
        expect(api.fetchWorklist.notCalled).toBe(true);
      });
    });

    it('should be serializable to a recipe', () => {
      const qs = av.querySet(qsInput);

      expect(qs.toRecipe()).toEqual({
        queries: qsInput.queries,
        state: qsInput.state,
        fetchParams: { worklistSamples: {} },
        queriesToSkip: []
      });
    });

    it('serialized recipe should include computed fetchParams and queriesToSkip', () => {
      const { cacheDependentQ, immutableQ, manualQ, optimisticQ, noCacheQ } = queries({

      });
      const av = new Avenger({ cacheDependentQ, immutableQ, manualQ, optimisticQ, noCacheQ }, {
        immutableQ: {
          immutable: 'immutableFoo'
        }
      }, {
        queries: { cacheDependentQ, immutableQ, manualQ, optimisticQ, noCacheQ },
        state: {}
      });
      const qs = av.querySet({ queries: { cacheDependentQ }, state: {} });

      expect(qs.toRecipe()).toEqual({
        queries: { cacheDependentQ },
        state: {},
        fetchParams: { cacheDependentQ: {
          immutableQ: { immutable: 'immutableFoo' }
        } },
        queriesToSkip: ['immutableQ']
      });
    });

    it('recipe there and back', () => {
      const qs = av.querySet(qsInput);

      return Promise.all([
        qs.run(),
        av.querySetFromRecipe(qs.toRecipe()).run()
      ]).then(([a, b]) => {
        expect(a).toEqual(b);
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
    const data = {
      immutableQ: { immutable: 'immutableFoo' },
      manualQ: { manual: 'manualFoo' },
      optimisticQ: { optimistic: 'optimisticFoo' }
    };
    const av = new Avenger({ immutableQ, manualQ, optimisticQ, noCacheQ, cacheDependentQ }, data, {
      queries: { immutableQ, manualQ, optimisticQ, noCacheQ, cacheDependentQ },
      state: {}
    });
    const qsInput = { queries: { cacheDependentQ }, state: {} };

    it('first change event should contain cached values for the QS', () => {
      const qs = av.querySet(qsInput);
      const stub = sinon.stub();
      qs.on('change', stub);

      return qs.run().then(() => {
        expect(stub.callCount).toBeGreaterThan(1);
        expect(_.omit(stub.getCall(0).args[0], '_meta')).toEqual({
          immutableQ: { immutable: 'immutableFoo' },
          manualQ: { manual: 'manualFoo' },
          optimisticQ: { optimistic: 'optimisticFoo' }
        });
      });
    });
  });

});