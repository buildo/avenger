import expect from 'expect';
import sinon from 'sinon';
import queries from '../fixtures/queries';
import build from '../../src/build';
import { runLocal } from '../../src/run';
import AvengerCache from '../../src/AvengerCache';

describe('runLocal', () => {
  const { A, B, C, D, E, F, G, H, I, J, K, L, M, N, O } = queries(
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
        foo: JSON.stringify({
          self: 'A', state, deps: {}
        }),
        bar: JSON.stringify({
          self: 'F', state, deps: {}
        })
      }
    },
    C: {
      self: 'C', state, deps: {
        foo: JSON.stringify({
          self: 'A', state, deps: {}
        })
      }
    },
    F: {
      self: 'F', state, deps: {}
    }
  };

  it('should work with empty cache', () => {
    const cache = new AvengerCache({});
    const emit = sinon.spy();

    return runLocal({ input, oldInput, state, oldState: state, emit, cache }).then(r => {
      expect(r).toEqual(results1);
      // cache is empty, every query should emit with
      // loading=true first, and then with loading=false when done
      expect(emit.callCount).toBe(8);
      const callArgs = emit.getCalls().map(c => c.args);
      ['A', 'B', 'C', 'F'].forEach(k => {
        const thisQArgs = callArgs.filter(([{ id }]) => id === k);
        const [{ error, cache, loading }, val] = thisQArgs[0];
        expect(!!error).toBe(false);
        expect(!!cache).toBe(false);
        expect(loading).toBe(true);
        expect(val).toBe(null);

        const [{ error: e, cache: c, loading: l }, value] = thisQArgs[1];
        expect(!!e).toBe(false);
        expect(!!c).toBe(false);
        expect(!!l).toBe(false);
        expect(value).toEqual(results1[k]);
      });
    }, err => {
      throw err;
    });
  });

  it('should work with cache: optimistic A', () => {
    const cache = new AvengerCache({});
    cache.set('A', state)(results1.A);
    const emit = sinon.spy();

    return runLocal({ input, oldInput, state, oldState: state, emit, cache }).then(r => {
      expect(r).toEqual(results1);

      // cache is empty except for A (optimistic), which
      // should emit twice with a value. Every other query
      // should emit twice as well, with
      // loading=true first, and then with loading=false when done

      expect(emit.callCount).toBe(8);
      const callArgs = emit.getCalls().map(c => c.args);

      const ACallArgs = callArgs.filter(([{ id }]) => id === 'A');
      const [{ error, cache, loading }, val] = ACallArgs[0];
      expect(!!error).toBe(false);
      expect(cache).toBe(true);
      expect(loading).toBe(true);
      expect(val).toEqual(results1.A);
      const [{ error: e, cache: c, loading: l }, value] = ACallArgs[1];
      expect(!!e).toBe(false);
      expect(!!c).toBe(false);
      expect(!!l).toBe(false);
      expect(value).toEqual(results1.A);

      ['B', 'C', 'F'].forEach(k => {
        const thisQArgs = callArgs.filter(([{ id }]) => id === k);
        const [{ error, cache, loading }, val] = thisQArgs[0];
        expect(!!error).toBe(false);
        expect(!!cache).toBe(false);
        expect(loading).toBe(true);
        expect(val).toBe(null);

        const [{ error: e, cache: c, loading: l }, value] = thisQArgs[1];
        expect(!!e).toBe(false);
        expect(!!c).toBe(false);
        expect(!!l).toBe(false);
        expect(value).toEqual(results1[k]);
      });
    }, err => {
      throw err;
    });
  });

  it('should work with cache: manual F', () => {
    const cache = new AvengerCache({});
    cache.set('F', state)(results1.F);
    const emit = sinon.spy();

    return runLocal({ input, oldInput, state, oldState: state, emit, cache }).then(r => {
      expect(r).toEqual(results1);

      // cache is empty except for F (manual), which
      // should emit once with the value. Every other query
      // should emit twice as well, with
      // loading=true first, and then with loading=false when done

      expect(emit.callCount).toBe(7);
      const callArgs = emit.getCalls().map(c => c.args);

      const FCallArgs = callArgs.filter(([{ id }]) => id === 'F');
      const [{ error, cache, loading }, val] = FCallArgs[0];
      expect(!!error).toBe(false);
      expect(cache).toBe(true);
      expect(loading).toBe(false);
      expect(val).toEqual(results1.F);

      ['A', 'B', 'C'].forEach(k => {
        const thisQArgs = callArgs.filter(([{ id }]) => id === k);
        const [{ error, cache, loading }, val] = thisQArgs[0];
        expect(!!error).toBe(false);
        expect(!!cache).toBe(false);
        expect(loading).toBe(true);
        expect(val).toBe(null);

        const [{ error: e, cache: c, loading: l }, value] = thisQArgs[1];
        expect(!!e).toBe(false);
        expect(!!c).toBe(false);
        expect(!!l).toBe(false);
        expect(value).toEqual(results1[k]);
      });
    }, err => {
      throw err;
    });
  });

  it('should work with diff in state', () => {
    const cache = new AvengerCache({});
    const emit = sinon.spy();

    return new Promise((resolve, reject) => {
      runLocal({
        input, oldInput, state, emit, cache,
        oldState: state
      }).then(r => {
        expect(r).toEqual(results1);
        // Every query should emit twice, with
        // loading=true first, and then with loading=false when done
        expect(emit.callCount).toBe(8);
        runLocal({
          input, oldInput: input, emit, cache,
          state: { ...state, more: 'foo' },
          oldState: state
        }).then(r => {
          // A, B should emit twice, with
          // loading=true first, and then with loading=false when done
          // (no cached value for new state for F),
          // except for C, which shouldn't run at all
          // (no diff in relevant state)
          expect(emit.callCount).toBe(14);
          const Fcalls = emit.getCalls().filter(c => c.args[0].id === 'F');
          expect(Fcalls.length).toBe(2 + 2);
          const Ccalls = emit.getCalls().filter(c => c.args[0].id === 'C');
          expect(Ccalls.length).toBe(2 + 0);
          resolve(r);
        }, reject).catch(reject);
      }, reject).catch(reject);
    });
  });

  it('should work with diff in state 2', () => {
    const cache = new AvengerCache({});
    const emit = sinon.spy();
    const all = { M, N, O };
    const input = build({ N, O }, all);
    const state = { a: 'a', n: 'n', o: 'o' };

    return new Promise((resolve, reject) => {
      runLocal({
        input, oldInput: null, state, emit, cache,
        oldState: state
      }).then(() => {
        // every query should have emitted twice
        expect(emit.callCount).toBe(6);
        runLocal({
          input, oldInput: input, emit, cache,
          state: { ...state, a: 'a1' },
          oldState: state
        }).then(() => {
          // a state has diff, and should in turn cause
          // deps to refetch, but deps are cached and immutable
          // and so they should emit only once
          // console.log(emit.getCalls().slice(6, 10).map(c => c.args[0]));
          expect(emit.callCount).toBe(10);
          resolve();
        }, reject).catch(reject);
      }, reject).catch(reject);
    });
  });


  const inputMulti = build({ L }, { I, J, K, L });
  const Jres = {
    self: 'J', state, deps: {}
  };
  const StringJres = JSON.stringify(Jres);
  const Kres = [
    'K I1 ' + StringJres,
    'K I2 ' + StringJres,
    'K I3 ' + StringJres
  ];
  const resultsMulti = {
    I: ['I1', 'I2', 'I3'],
    J: Jres,
    K: Kres,
    L: 'L ' + JSON.stringify(Kres)
  };

  it('should support multi', () => {
    const cache = new AvengerCache({});
    const emit = sinon.spy();

    return runLocal({
      input: inputMulti,
      oldInput, state, oldState: state, emit, cache
    }).then(r => {
      expect(r).toEqual(resultsMulti);
      // I, J, L: no cache queries (each one should emit twice)
      // K is multi on I (3 results) -> should emit 3 times for partial
      // multi results + one for final aggregated res.
      // TODO(gio): should also emit for the aggregated INITIAL value?
      // 13 = 2 * (3 * 1 + 1 * 3) + 1 <-- aggregated multi emit
      expect(emit.callCount).toBe(13);

      const callsArgs = emit.getCalls().map(c => c.args);
      const KcallsArgs = callsArgs.filter(([{ id }]) => id === 'K');
      expect(KcallsArgs.length).toBe(7);
      expect(KcallsArgs.filter(([{ multi }]) => multi).length).toBe(KcallsArgs.length);
      expect(KcallsArgs.filter(([{ multiAll }]) => multiAll).length).toBe(1);
      const KmultiIndexCallsArgs = KcallsArgs.filter(([{ multiIndex }]) => typeof multiIndex !== 'undefined');
      expect(KmultiIndexCallsArgs.length).toBe(6);
      const indexes = KmultiIndexCallsArgs.map(([{ multiIndex }]) => multiIndex);
      expect(indexes.length).toBe(6);
      expect(indexes).toContain(0);
      expect(indexes).toContain(1);
      expect(indexes).toContain(2);
      const multiValue = KcallsArgs.filter(([{ multiAll }]) => multiAll)[0][1];
      expect(multiValue).toEqual(Kres);
    }, err => {
      throw err;
    });
  });
});
