import makeTestGraph from './makeBasicTestGraph';
import { querySync, restoreQueryCaches } from '../../src/graph';

const extractedCaches = {
  master: {
    a: { token: 'foo' },
    value: {
      bar: {
        foo: 'foo',
        token: 'foo'
      }
    }
  },
  slave_finalFetch: {
    a: {
      master: {
        bar: {
          foo: 'foo',
          token: 'foo'
        }
      }
    },
    value: {
      foo: 'foo',
      token: 'foo'
    }
  },
  a: {
    a: {},
    value: 'a'
  }
};

describe('restoreQueryCaches', () => {

  it('should work', () => {
    const graph = makeTestGraph()

    restoreQueryCaches(graph, extractedCaches);
    expect(
      querySync(graph, ['master', 'slave', 'a'], { token: 'foo' })
    ).toEqual({
      loading: false,
      data: {
        master: { loading: false, data: extractedCaches.master.value },
        slave: { loading: false, data: extractedCaches.slave_finalFetch.value },
        a: { loading: false, data: extractedCaches.a.value }
      }
    });
  });

});
