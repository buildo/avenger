import makeTestGraph from './makeBasicTestGraph';
import { querySync, restoreQueryCaches } from '../src';

const extractedCaches = {
  master: {
    fetch: {
      a: { token: 'foo' },
      value: {
        bar: {
          foo: 'foo',
          token: 'foo'
        }
      }
    }
  },
  slave: {
    syncFetchA: {
      a: { slaveToken: 'slaveFoo' },
      value: ['slaveFoo']
    },
    finalFetch: {
      a: {
        master: {
          bar: {
            foo: 'foo',
            token: 'foo'
          }
        },
        slaveToken: 'slaveFoo'
      },
      value: {
        foo: 'foo',
        token: 'foo',
        slaveToken: 'slaveFoo'
      }
    }
  },
  a: {
    fetch: {
      a: {},
      value: 'a'
    }
  }
};

describe('restoreQueryCaches', () => {

  it('should work', () => {
    const { master, slave, a } = makeTestGraph()

    restoreQueryCaches({ master, slave, a }, extractedCaches);
    expect(
      querySync({ master, slave, a }, { token: 'foo', slaveToken: 'slaveFoo' })
    ).toEqual({
      loading: false,
      data: {
        master: { loading: false, data: extractedCaches.master.fetch.value },
        slave: { loading: false, data: extractedCaches.slave.finalFetch.value },
        a: { loading: false, data: extractedCaches.a.fetch.value }
      }
    });
  });

});
