import expect from 'expect';
import t from 'tcomb';
import { Query } from '../../src/types';
import mkAvenger from '../../src/mkAvenger';

const a = Query({
  id: 'a',
  params: { foo: t.String, bar: t.Object },
  fetch: () => Promise.resolve(null)
});

const b = Query({
  id: 'b',
  fetch: () => Promise.resolve(null)
});

const c = Query({
  id: 'c',
  dependencies: {
    a: { query: a },
    b: { query: b }
  },
  params: { baz: t.Number },
  fetch: () => Promise.resolve(null)
});

describe('queriesSync', () => {

  it('should return complete structure even when no value is available', () => {

    const av = mkAvenger({ a, b, c });
    const val = av.queriesSync({
      a: { foo: 'foo', bar: {} },
      c: { baz: 1, foo: 'foo', bar: {} }
    });
    expect(val.hasOwnProperty('a')).toBe(true);
    expect(val.hasOwnProperty('c')).toBe(true);
    expect(val.hasOwnProperty('readyState')).toBe(true);
    expect(val.readyState.hasOwnProperty('a')).toBe(true);
    expect(val.readyState.hasOwnProperty('c')).toBe(true);

  });

  it('should return current value', () => new Promise(resolve => {
    const av = mkAvenger({ a, b, c });
    const queriesDecl = {
      a: { foo: 'foo', bar: {} },
      c: { baz: 1, foo: 'foo', bar: {} }
    };
    av.queries(queriesDecl);

    Promise.resolve().then(() => {
      const val = av.queriesSync(queriesDecl);
      expect(val.a).toBe(null);
      expect(val.c).toBe(undefined);
      expect(val.readyState.a.loading).toBe(false);
      expect(val.readyState.c.loading).toBe(true);

      Promise.resolve().then(() => {
        const val = av.queriesSync(queriesDecl);
        expect(val.a).toBe(null);
        expect(val.c).toBe(null);
        expect(val.readyState.a.loading).toBe(false);
        expect(val.readyState.c.loading).toBe(false);

        resolve();
      });
    });
  }));

});
