import 'rxjs'
import { query, extractQueryCaches, Query as Node, available } from '../src';
import makeTestGraph from './makeBasicTestGraph';

describe('extractQueryCaches', () => {

  it('should return an empty object for empty caches', () => {
    const { master, slave, a } = makeTestGraph()

    const caches = extractQueryCaches({ master, slave, a }, { token: 'foo', slaveToken: 'slaveFoo' });
    expect(caches).toEqual({});
  });

  it('should extract cache values', () => new Promise((resolve, reject) => {
    const { master, slave, a } = makeTestGraph()

    query({ master, slave, a }, { token: 'foo', slaveToken: 'slaveFoo' });
    setTimeout(() => {
      const caches = extractQueryCaches({ master, slave, a }, { token: 'foo', slaveToken: 'slaveFoo' });
      try {
        expect(Object.keys(caches).length).toBe(3);
        expect(caches.master).toBeDefined();
        expect(caches.master.fetch).toBeDefined();
        expect(caches.master.fetch.value).toEqual({ bar: { foo: 'foo', token: 'foo' } });
        expect(caches.slave).toBeDefined();
        expect(caches.slave.finalFetch).toBeDefined();
        expect(caches.slave.finalFetch.value).toEqual({ foo: 'foo', token: 'foo', slaveToken: 'slaveFoo' });
        expect(caches.slave.syncFetchA).toBeDefined();
        expect(caches.slave.syncFetchA.value).toEqual(['slaveFoo']);
        expect(caches.a).toBeDefined();
        expect(caches.a.fetch).toBeDefined();
        expect(caches.a.fetch.value).toEqual('a');
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 10);
  }));

  it('should extract only requested cache values', () => new Promise((resolve, reject) => {
    const { master, slave, a } = makeTestGraph();

    query({ master, slave, a }, { token: 'foo', slaveToken: 'slaveFoo' });
    query({ master, slave, a }, { token: 'bar', slaveToken: 'slaveBar' });
    setTimeout(() => {
      const caches = extractQueryCaches({ master, slave, a }, { token: 'foo', slaveToken: 'slaveFoo' });
      try {
        expect(Object.keys(caches).length).toBe(3);
        expect(caches.master).toBeDefined();
        expect(caches.master.fetch).toBeDefined();
        expect(caches.master.fetch.value).toEqual({ bar: { foo: 'foo', token: 'foo' } });
        expect(caches.slave).toBeDefined();
        expect(caches.slave.syncFetchA).toBeDefined();
        expect(caches.slave.syncFetchA.value).toEqual(['slaveFoo']);
        expect(caches.slave.finalFetch).toBeDefined();
        expect(caches.slave.finalFetch.value).toEqual({ foo: 'foo', token: 'foo', slaveToken: 'slaveFoo' });
        expect(caches.a).toBeDefined();
        expect(caches.a.fetch).toBeDefined();
        expect(caches.a.fetch.value).toEqual('a');
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 10);
  }));

  it('should extract only requested cache nodes', () => new Promise((resolve, reject) => {
    const { master, slave, a } = makeTestGraph();
    const slave2 = Node({
      debugId: 'slave2',
      strategy: available,
      params: { slave2Token: 'slave2Token' },
      dependencies: { slave },
      fetch: ({ slave, slave2Token }) => Promise.resolve({ ...slave, slave2Token })
    });

    query({ master, a, slave2 }, { token: 'foo', slaveToken: 'slaveFoo', slave2Token: 'slave2Foo' });
    setTimeout(() => {
      const caches = extractQueryCaches({ master, a, slave2 }, { token: 'foo', slaveToken: 'slaveFoo', slave2Token: 'slave2Foo' });
      try {
        expect(Object.keys(caches).length).toBe(3);
        expect(caches.master).toBeDefined();
        expect(caches.slave2).toBeDefined();
        expect(caches.a).toBeDefined();
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 10);
  }))

});
