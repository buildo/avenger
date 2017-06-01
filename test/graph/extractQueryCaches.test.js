import 'rxjs'
import { query, extractQueryCaches } from '../../src/graph';
import makeTestGraph from './makeBasicTestGraph';

describe('extractQueryCaches', () => {

  it('should return an empty object for empty caches', () => {
    const graph = makeTestGraph()

    const caches = extractQueryCaches(graph, ['master', 'slave', 'a'], { token: 'foo', slaveToken: 'slaveFoo' });
    expect(caches).toEqual({});
  });

  it('should extract cache values', () => new Promise((resolve, reject) => {
    const graph = makeTestGraph()

    query(graph, ['master', 'slave', 'a'], { token: 'foo', slaveToken: 'slaveFoo' });
    setTimeout(() => {
      const caches = extractQueryCaches(graph, ['master', 'slave', 'a'], { token: 'foo', slaveToken: 'slaveFoo' });
      try {
        expect(Object.keys(caches).length).toBe(4);
        expect(caches.master).toBeDefined();
        expect(caches.master.value).toEqual({ bar: { foo: 'foo', token: 'foo' } });
        expect(caches.slave_syncFetchA).toBeDefined();
        expect(caches.slave_syncFetchA.value).toEqual(['slaveFoo']);
        expect(caches.slave_finalFetch).toBeDefined();
        expect(caches.slave_finalFetch.value).toEqual({ foo: 'foo', token: 'foo', slaveToken: 'slaveFoo' });
        expect(caches.a).toBeDefined();
        expect(caches.a.value).toEqual('a');
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 10);
  }));

  it('should extract only requested cache values', () => new Promise((resolve, reject) => {
    const graph = makeTestGraph()

    query(graph, ['master', 'slave', 'a'], { token: 'foo', slaveToken: 'slaveFoo' });
    query(graph, ['master', 'slave', 'a'], { token: 'bar', slaveToken: 'slaveBar' });
    setTimeout(() => {
      const caches = extractQueryCaches(graph, ['master', 'slave', 'a'], { token: 'foo', slaveToken: 'slaveFoo' });
      try {
        expect(Object.keys(caches).length).toBe(4);
        expect(caches.master).toBeDefined();
        expect(caches.master.value).toEqual({ bar: { foo: 'foo', token: 'foo' } });
        expect(caches.slave_syncFetchA).toBeDefined();
        expect(caches.slave_syncFetchA.value).toEqual(['slaveFoo']);
        expect(caches.slave_finalFetch).toBeDefined();
        expect(caches.slave_finalFetch.value).toEqual({ foo: 'foo', token: 'foo', slaveToken: 'slaveFoo' });
        expect(caches.a).toBeDefined();
        expect(caches.a.value).toEqual('a');
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 10);
  }));

});
