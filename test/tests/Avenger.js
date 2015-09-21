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
});
