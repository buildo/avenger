import expect from 'expect';
import t from 'tcomb';
import { Query, Command } from '../../src/types';

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

const d = Query({
  id: 'd',
  dependencies: {
    c: { query: c }
  },
  params: { foobar: t.String },
  fetch: () => Promise.resolve(null)
});

describe('Query.prototype.upsetActualParams', () => {

  it('should return query param types if query has no dependencies', () => {

    expect(a.upsetActualParams).toEqual(a.params);

  });

  it('should return an empty object if query has no params and no dependencies ', () => {

    expect(b.upsetActualParams).toEqual({});

  });

  it('should return query params union all deps `upsetActualParams` if query has deps', () => {

    expect(c.upsetActualParams).toEqual({ ...a.params, ...c.params });

  });

  it('should work recursively', () => {

    expect(d.upsetActualParams).toEqual({ ...a.params, ...c.params, ...d.params });

  });

  it('should cache accesses', () => {

    const params = d.upsetActualParams;
    expect(d.upsetActualParams).toBe(params);

  });

});

const cmd1 = Command({
  id: 'cmd1',
  run: () => Promise.resolve(null)
});

const cmd2 = Command({
  id: 'cmd2',
  invalidates: { a, b, d },
  run: () => Promise.resolve(null)
});

describe('Command.prototype.invalidateParams', () => {

  it('should return an empty object if command has no invalidations', () => {

    expect(cmd1.invalidateParams).toEqual({});

  });

  it('should return union of all `invalidates` queries', () => {

    expect(cmd2.invalidateParams).toEqual({
      ...a.upsetActualParams,
      ...b.upsetActualParams,
      ...d.upsetActualParams
    });

  });

  it('should cache accesses', () => {

    const params = cmd1.invalidateParams;
    expect(cmd1.invalidateParams).toBe(params);

  });

});
