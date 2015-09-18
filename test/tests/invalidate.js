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

  it('should work 1', () => {
    // should invalidate (wrt input)
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
    const emit = sinon.spy();
    const invalidate = { A };

    return invalidateLocal({
      result: results1,
      input,
      invalidate,
      state, emit, cache
    }).then(r => {
      expect(r).toEqual(results1);
      expect(emit.callCount).toBe(4);
      ['A', 'F', 'C', 'B'].forEach(k => {
        expect(emit.getCalls().map(c => c.args).filter(([{ id }, val]) => id === k && val.self === results1[k].self).length).toBe(1);
      });
      expect(emit.getCall(0).args).toEqual([{
        cache: true, id: 'F'
      }, results1.F]);
    }, err => {
      throw err;
    });
  });

  it('should work 2', () => {
    // should invalidate (wrt input)
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
      expect(emit.callCount).toBe(4);
      ['A', 'F', 'C', 'B'].forEach(k => {
        expect(emit.getCalls().map(c => c.args).filter(([{ id }, val]) => id === k && val.self === results1[k].self).length).toBe(1);
      });
    }, err => {
      throw err;
    });
  });

});
