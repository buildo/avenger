import 'rxjs'
import assert from 'assert'
import { invalidate, query } from '../../src/graph';
import { Expire, available } from '../../src/cache/strategies';
import { Query as Node } from '../../src/graph/QueryNode'

const state = {
  foo: null,
  slaveFetchCount: null
}

const MASTER_EXPIRE_TIME = 100;

const makeTestGraph = () => {
  const master = Node({
    id: 'master',
    strategy: new Expire(MASTER_EXPIRE_TIME),
    params: { token: 'token' },
    fetch: () => Promise.resolve({ bar: { foo: state.foo } })
  });
  const slave = Node({
    id: 'slave',
    strategy: available,
    dependencies: { master },
    fetch: ({ master: { bar } }) => {
      state.slaveFetchCount = state.slaveFetchCount + 1;
      return Promise.resolve(bar);
    }
  })

  return { master, slave };
}

describe('graph/deps', () => {

  it('"slave" should be re-fetched if "master" changes and is being observed', () => {
    const { master, slave } = makeTestGraph()

    state.foo = 'foo_1';
    state.slaveFetchCount = 0;

    const slaveQuery = query({ slave }, { token: 'token' })

    slaveQuery.subscribe(() => {}); // add a subscriber to "slave"

    return new Promise((resolve, reject) => {
      // invalidate "master" after its cache has already expired
      setTimeout(() => {
        state.foo = 'foo_2';
        invalidate({ master }, { token: 'token' }) // invalidate later on

        // verify that "slave" has been correctly re-fetched
        setTimeout(() => {
          slaveQuery.subscribe((r) => {
            try {
              assert.equal(r.data.slave.data.foo, 'foo_2');
              assert.equal(state.slaveFetchCount, 2);
              resolve();
            } catch (e) {
              reject(e)
            }
          });
        }, MASTER_EXPIRE_TIME * 2)
      }, MASTER_EXPIRE_TIME * 2);
    })

  });

  it('"slave" should not be re-fetched if "master" changes but is not being observed', () => {
    const { master, slave } = makeTestGraph()

    state.foo = 'foo_1';
    state.slaveFetchCount = 0;

    const masterQuery = query({ master }, { token: 'token' });
    query({ slave }, { token: 'token' });

    masterQuery.subscribe(() => {}); // add a subscriber to "master"

    return new Promise((resolve, reject) => {
      // invalidate "master" after its cache has already expired
      setTimeout(() => {
        state.foo = 'foo_2';
        invalidate({ master }, { token: 'token' }) // invalidate later on

        // verify that "slave" has been correctly re-fetched
        setTimeout(() => {
          try {
            assert(state.slaveFetchCount, 0);
            resolve();
          } catch (e) {
            reject(e)
          }
        }, MASTER_EXPIRE_TIME * 2)
      }, MASTER_EXPIRE_TIME * 2);
    });
  });

});
