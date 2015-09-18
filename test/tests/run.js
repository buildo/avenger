import expect from 'expect';
import sinon from 'sinon';
import queries from '../fixtures/queries';
import build from '../../src/build';
import { runLocal } from '../../src/run';
import AvengerCache from '../../src/AvengerCache';

describe('runLocal', () => {
  const { A, B, C, D, E, F, G, H } = queries(
    k => state => deps => Promise.resolve({
      self: k, state, deps
    })
  );
  const all = { A, B, C, D, E, F, G, H };
  const state = { s1: 'foo' };
  const oldInput = null;
  const input = build({ C, B }, all);

  const results1 = {
    A: {
      self: 'A', state, deps: {}
    },
    B: {
      self: 'B', state, deps: {
        foo: {
          self: 'A', state, deps: {}
        },
        bar: {
          self: 'F', state, deps: {}
        }
      }
    },
    C: {
      self: 'C', state, deps: {
        foo: {
          self: 'A', state, deps: {}
        }
      }
    },
    F: {
      self: 'F', state, deps: {}
    }
  };

  it('should work with empty cache', () => {
    const cache = new AvengerCache({});
    const emit = sinon.spy();

    return runLocal({ input, oldInput, state, emit, cache }).then(r => {
      expect(r).toEqual(results1);
      expect(emit.callCount).toBe(4);
      const callArgs = emit.getCalls().map(c => c.args);
      ['A', 'B', 'C', 'F'].forEach(k => {
        expect(callArgs.filter(([{ id, error }, val]) => {
          return !error && id === k && val && expect(val).toEqual(results1[k]);
        }).length === 1).toBe(true);
      });
    }, err => {
      throw err;
    });
  });

  it('should work with cache: optimistic A', () => {
    const cache = new AvengerCache({});
    cache.set('A', state)(results1.A);
    const emit = sinon.spy();

    return runLocal({ input, oldInput, state, emit, cache }).then(r => {
      expect(r).toEqual(results1);
      expect(emit.callCount).toBe(5);
      const callArgs = emit.getCalls().map(c => c.args);
      const cachedCallArgs = callArgs.filter(([{ cache }]) => cache);
      expect(cachedCallArgs.length).toBe(1);
      expect(cachedCallArgs[0]).toEqual([
        { id: 'A', cache: true },
        results1.A
      ]);
    }, err => {
      throw err;
    });
  });

  it('should work with cache: manual F', () => {
    const cache = new AvengerCache({});
    cache.set('F', state)(results1.F);
    const emit = sinon.spy();

    return runLocal({ input, oldInput, state, emit, cache }).then(r => {
      expect(r).toEqual(results1);
      expect(emit.callCount).toBe(4);
      const callArgs = emit.getCalls().map(c => c.args);
      const cachedCallArgs = callArgs.filter(([{ cache }]) => cache);
      expect(cachedCallArgs.length).toBe(1);
      expect(cachedCallArgs[0]).toEqual([
        { id: 'F', cache: true },
        results1.F
      ]);
    }, err => {
      throw err;
    });
  });
});
