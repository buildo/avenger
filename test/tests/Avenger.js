import expect from 'expect';
import sinon from 'sinon';
import queries from '../fixtures/queries';
import Avenger, { Command } from '../../src/';

describe('Avenger', () => {
  const { A, B, C, D, E, F, G, H, I, J, K, L } = queries();
  const all = { A, B, C, D, E, F, G, H, I, J, K, L };
  const state = { s1: 'foo' };
  const results1 = {
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    E: 'E',
    F: 'F',
    G: 'G'
  };

  it('should be instantiable and have Emitter interface', () => {
    const av = new Avenger(all);
    expect(av.on).toBeA(Function);
    expect(av.off).toBeA(Function);
  });

  it('run() should work', () => {
    const av = new Avenger(all);
    const changeSpy = sinon.spy();
    av.on('change', changeSpy);
    const start = new Date().getTime() - 1;

    return av.run({ E, G }, state).then(res => {
      const end = new Date().getTime() + 1;
      expect(res).toEqual(results1);
      expect(changeSpy.callCount).toBe(14);
      const [{ __meta, ...value }] = changeSpy.getCall(13).args;
      expect(value).toEqual(results1);
      Object.keys(__meta).forEach(k => {
        expect(__meta[k].cache).toBe(false);
        expect(__meta[k].error).toBe(false);
        expect(__meta[k].loading).toBe(false);
        expect(__meta[k].timestamp).toBeMoreThan(start).toBeLessThan(end);
      });
    }, err => {
      throw err;
    });
  });

  it('invalidate() should work', () => {
    const av = new Avenger(all);

    return new Promise((resolve, reject) => {
      av.run({ E, G }, state).then(() => {
        setTimeout(() => {
          const changeSpy = sinon.spy();
          av.on('change', changeSpy);
          const start = new Date().getTime() - 1;

          av.invalidate(state, { F }).then(res => {
            const end = new Date().getTime() + 1;
            expect(res).toEqual(results1);
            expect(changeSpy.callCount).toBe(14);
            const [{ __meta, ...value }] = changeSpy.getCall(13).args;
            Object.keys(__meta).forEach(k => {
              expect(__meta[k].cache).toBe(false);
              expect(__meta[k].error).toBe(false);
              expect(__meta[k].loading).toBe(false);
              expect(__meta[k].timestamp).toBeMoreThan(start).toBeLessThan(end);
            });

            resolve(res);
          }, reject).catch(reject);
        }, 50);
      }, reject).catch(reject);
    });
  });

  it('runCommand() should work', () => {
    const av = new Avenger(all);

    return new Promise((resolve, reject) => {
      av.run({ E, G }, state).then(() => {
        setTimeout(() => {
          const changeSpy = sinon.spy();
          av.on('change', changeSpy);
          const cmdRes = 'cmdRes';
          const command = Command({
            invalidates: { D },
            run: () => Promise.resolve(cmdRes)
          });

          av.runCommand(state, command).then(res => {
            expect(res).toEqual(cmdRes);
            setTimeout(() => {
              // F is manual, and not part of D's downset
              // (so it should correctly not refresh)
              // 13 = 6 * 2 + 1 * 1
              expect(changeSpy.callCount).toBe(13);
              resolve(res);
            }, 50);
          }, reject).catch(reject);
        }, 50);
      }, reject).catch(reject);
    });
  });

  it('multiple run() no changes should work', () => {
    const av = new Avenger(all);
    const changeSpy = sinon.spy();
    av.on('change', changeSpy);
    const result = {
      A: 'A', B: 'B', D: 'D', F: 'F', G: 'G'
    };

    return new Promise((resolve, reject) => {
      av.run({ G }, state).then(res => {
        expect(res).toEqual(result);
        // empty cache, 5 queries
        expect(changeSpy.callCount).toBe(10);
        const [{ __meta, ...value }] = changeSpy.getCall(9).args;
        expect(value).toEqual(result);

        av.run({ G }, state).then(res => {
          expect(res).toEqual({});
          expect(changeSpy.callCount).toBe(10);

          resolve(res);
        }, reject).catch(reject);
      }, reject).catch(reject);
    });
  });

  it('multiple run() different queries should work', () => {
    const av = new Avenger(all);
    const changeSpy = sinon.spy();
    av.on('change', changeSpy);
    const firstResult = {
      A: 'A', B: 'B', D: 'D', F: 'F', G: 'G'
    };
    const secondResult = {
      A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F'
    };
    const diffResult = {
      C: 'C', E: 'E'
    };

    return new Promise((resolve, reject) => {
      av.run({ G }, state).then(res => {
        expect(res).toEqual(firstResult);
        // empty cache, 5 queries
        expect(changeSpy.callCount).toBe(10);
        const [{ __meta, ...value }] = changeSpy.getCall(9).args;
        expect(value).toEqual(firstResult);

        av.run({ E }, state).then(res => {
          expect(res).toEqual(diffResult);
          // 10 + 4 queries * 2
          // D and F are cached and manual (-> + 2 * 1)
          expect(changeSpy.callCount).toBe(20);
          const [{ __meta, ...value }] = changeSpy.getCall(19).args;
          expect(value).toEqual(secondResult);

          resolve(res);
        }, reject).catch(reject);
      }, reject).catch(reject);
    });
  });

  it('multiple run() different state should work', () => {
    const av = new Avenger(all);
    const changeSpy = sinon.spy();
    av.on('change', changeSpy);
    const state1 = state;
    const state2 = { ...state, more: 'this' };
    const result = {
      A: 'A', B: 'B', D: 'D', F: 'F', G: 'G'
    };

    return new Promise((resolve, reject) => {
      av.run({ G }, state1).then(res => {
        expect(res).toEqual(result);
        // empty cache, 5 queries
        expect(changeSpy.callCount).toBe(10);
        const [{ __meta, ...value }] = changeSpy.getCall(9).args;
        expect(value).toEqual(result);

        av.run({ G }, state2).then(res => {
          // only state-change-affected queries should refetch
          // 10 (previous call count) +
          // 1 * 2 (B is affected) +
          // 1 * 2 (A is affected) +
          // 1 * 2 (F is affected) +
          // 1 * 0 (D is not affected and G neither) +
          // 1 * 0 (G is not affected)
          expect(changeSpy.callCount).toBe(16);
          const [{ __meta, ...value }] = changeSpy.getCall(15).args;
          expect(value).toEqual(result);

          resolve(res);
        }, reject).catch(reject);
      }, reject).catch(reject);
    });
  });
});
