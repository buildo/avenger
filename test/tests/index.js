import expect from 'expect';
import sinon from 'sinon';

import queries from '../../fixtures/queries';
import { AvengerInput } from '../../src';
import { schedule } from '../../src';
import AvengerCache from '../../src/AvengerCache';

describe('schedule', () => {
  const getAPI = () => {
    const API = {};
    API.fetchNoCacheFoo = sinon.stub().returns(Promise.resolve('noCacheFoo'));
    API.fetchOptimisticFoo = sinon.stub().returns(Promise.resolve('optimisticFoo'));
    API.fetchManualFoo = sinon.stub().returns(Promise.resolve('manualFoo'));
    API.fetchImmutableFoo = sinon.stub().returns(Promise.resolve('immutableFoo'));
    API.fetchBar = sinon.stub().returns(Promise.resolve('bar'));
    return API;
  };

  it('should schedule', () => {
    const API = getAPI();
    const { cacheDependentQ, immutableQ } = queries(API);
    const input = AvengerInput({ queries: [
      { query: cacheDependentQ },
      { query: immutableQ },
    ] });
    const cache = new AvengerCache();
    return schedule(input, cache).then((output) => {
      expect(output).toEqual({
        cacheDependentQ: { bar: 'bar' },
        immutableQ: { immutable: 'immutableFoo' }
      });

      return Promise.resolve();
    });
  });
});
