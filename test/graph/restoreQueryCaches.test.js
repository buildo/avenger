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
  slave_syncFetchA: {
    a: { slaveToken: 'slaveFoo' },
    value: ['slaveFoo']
  },
  slave_finalFetch: {
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
  },
  a: {
    a: {},
    value: 'a'
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
        master: { loading: false, data: extractedCaches.master.value },
        slave: { loading: false, data: extractedCaches.slave_finalFetch.value },
        a: { loading: false, data: extractedCaches.a.value }
      }
    });
  });

});
