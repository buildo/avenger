import expect from 'expect';
import sinon from 'sinon';
import queries from '../fixtures/queries';
import build from '../../src/build';
import { invalidateLocal } from '../../src/invalidate';
import AvengerCache from '../../src/AvengerCache';

describe('invalidateLocal', () => {
  const { A, B, C, D, E, F, G, H } = queries(
    k => state => deps => Promise.resolve({
      self: k, state, deps
    })
  );
  const all = { A, B, C, D, E, F, G, H };
  const state = { s1: 'foo' };
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

  it('should work 1', () => {
    // should re-fetch (or get cached) wrt input
    // the following UPPERCASE queries:
    //
    //     A   f
    //    /|\ /
    //   C | B
    //   | | |
    //
    const cache = new AvengerCache({});
    cache.set('A', state)(results1.A);
    cache.set('F', state)(results1.F);

    // these (not part of input but cacheable)
    // should be invalidated anyway:
    const DCacheParams = {
      ...state,
      foo: results1.A,
      bar: results1.B
    };
    cache.set('D', DCacheParams)(results1.D);
    const Dresults = {
      self: 'B', state, deps: {
        foo: {
          self: 'A', state, deps: {}
        },
        bar: {
          self: 'F', state, deps: {}
        }
      }
    };
    const ECacheParams = {
      ...state,
      foo: results1.C,
      bar: Dresults
    };
    cache.set('E', ECacheParams)(results1.E);

    const emit = sinon.spy();
    const invalidate = { A };

    return invalidateLocal({
      result: results1,
      input,
      invalidate,
      state, emit, cache
    }).then(r => {
      expect(r).toEqual(results1);
      // A, B, C should emit twice (A is cached but invalidated)
      // F should emit once (cached and manual)
      expect(emit.callCount).toBe(7);
      const callArgs = emit.getCalls().map(c => c.args);

      const ACallArgs = callArgs.filter(([{ id }]) => id === 'A');
      expect(ACallArgs.length).toBe(2);
      expect(ACallArgs[0][1]).toBe(null);
      expect(ACallArgs[0][0].loading).toBe(true);
      expect(!!ACallArgs[1][0].cache).toBe(false);
      expect(!!ACallArgs[1][0].loading).toBe(false);
      expect(ACallArgs[1][1]).toEqual(results1.A);

      const FCallArgs = callArgs.filter(([{ id }]) => id === 'F');
      expect(FCallArgs.length).toBe(1);
      expect(FCallArgs[0][1]).toBe(results1.F);
      expect(!!FCallArgs[0][0].loading).toBe(false);
      expect(FCallArgs[0][0].cache).toBe(true);

      expect(cache.get('D', DCacheParams)).toNotExist();
      expect(cache.get('E', ECacheParams)).toNotExist();
    }, err => {
      throw err;
    });
  });

  it('should work 2', () => {
    // should re-fetch (wrt input)
    // the following UPPERCASE queries:
    //
    //     A   F
    //    /|\ /
    //   C | B
    //   | | |
    //
    const cache = new AvengerCache({});
    cache.set('A', state)(results1.A);
    cache.set('F', state)(results1.F);
    const emit = sinon.spy();
    const invalidate = { A, F };

    return invalidateLocal({
      result: results1,
      input,
      invalidate,
      state, emit, cache
    }).then(r => {
      expect(r).toEqual(results1);
      // each query should emit twice
      expect(emit.callCount).toBe(8);
      ['A', 'F', 'C', 'B'].forEach(k => {
        expect(emit.getCalls().map(c => c.args).filter(([{ id }]) => id === k).length).toBe(2);
      });
    }, err => {
      throw err;
    });
  });

  it('should work 3', () => {
    // should re-fetch all queries (or get from cache)
    // (input includes all, A transitively invalidates all,
    // including F)
    //
    //     A   F
    //    /|\ /
    //   C | B
    //   | |/
    //   | D
    //   |/ \
    //   E   G
    //
    const { A, B, C, D, E, F, G } = queries();
    const all = { A, B, C, D, E, F, G };
    const input = build({ E, G }, all);
    const cache = new AvengerCache({});
    const emit = sinon.spy();
    const invalidate = { A };
    const results = Object.keys(all).reduce((ac, k) => ({
      ...ac,
      [k]: k
    }), {});

    return invalidateLocal({
      result: results,
      input: input,
      invalidate,
      state, emit, cache
    }).then(r => {
      expect(r).toEqual(results);
      // A invalidation should cause
      // C, B, D, E, G invalidation
      // in turn causing also F to re-fetch (actually emits from cache)
      expect(emit.callCount).toBe(14);
    }, err => {
      throw err;
    });
  });

});
