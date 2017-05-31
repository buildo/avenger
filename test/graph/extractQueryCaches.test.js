import 'rxjs'
import { query, extractQueryCaches } from '../../src/graph';
import makeTestGraph from './makeBasicTestGraph';

describe('extractQueryCaches', () => {

  it('should return an empty object for empty caches', () => {
    const graph = makeTestGraph()

    const caches = extractQueryCaches(graph, ['master', 'slave', 'a'], { token: 'foo' });
    expect(caches).toEqual({});
  });

  it('should extract cache values', () => new Promise((resolve, reject) => {
    const graph = makeTestGraph()

    query(graph, ['master', 'slave', 'a'], { token: 'foo' });
    setTimeout(() => {
      const caches = extractQueryCaches(graph, ['master', 'slave', 'a'], { token: 'foo' });
      try {
        expect(Object.keys(caches).length).toBe(3);
        expect(caches.master.length).toBe(1);
        expect(caches.master[0].value).toEqual({ bar: { foo: 'foo', token: 'foo' } });
        expect(caches.slave_finalFetch.length).toBe(1);
        expect(caches.slave_finalFetch[0].value).toEqual({ foo: 'foo', token: 'foo' });
        expect(caches.a.length).toBe(1);
        expect(caches.a[0].value).toEqual('a');
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 10);
  }));

  it('should extract only requested cache values', () => new Promise((resolve, reject) => {
    const graph = makeTestGraph()

    query(graph, ['master', 'slave', 'a'], { token: 'foo' });
    query(graph, ['master', 'slave', 'a'], { token: 'bar' });
    setTimeout(() => {
      const caches = extractQueryCaches(graph, ['master', 'slave', 'a'], { token: 'foo' });
      try {
        expect(Object.keys(caches).length).toBe(3);
        expect(caches.master.length).toBe(1);
        expect(caches.master[0].value).toEqual({ bar: { foo: 'foo', token: 'foo' } });
        expect(caches.slave_finalFetch.length).toBe(1);
        expect(caches.slave_finalFetch[0].value).toEqual({ foo: 'foo', token: 'foo' });
        expect(caches.a.length).toBe(1);
        expect(caches.a[0].value).toEqual('a');
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 10);
  }));

});
