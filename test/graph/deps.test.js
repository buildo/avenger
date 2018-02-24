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
    dependencies: {
      master: { query: master }
    },
    fetch: ({ master: { bar } }) => {
      state.slaveFetchCount = state.slaveFetchCount + 1;
      return Promise.resolve(bar);
    }
  })

  return { master, slave };
}

describe('graph/deps', () => {

  it('"slave" should be re-fetched if "master" changes and is being observed', () => {
    const graph = makeTestGraph()

    state.foo = 'foo_1';
    state.slaveFetchCount = 0;

    const slave = query(graph, ['slave'], { token: 'token' })

    slave.subscribe(() => {}); // add a subscriber to "slave"

    return new Promise((resolve, reject) => {
      // invalidate "master" after its cache has already expired
      setTimeout(() => {
        state.foo = 'foo_2';
        invalidate(graph, ['master'], { token: 'token' }) // invalidate later on

        // verify that "slave" has been correctly re-fetched
        setTimeout(() => {
          slave.subscribe((r) => {
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
    const graph = makeTestGraph()

    state.foo = 'foo_1';
    state.slaveFetchCount = 0;

    const master = query(graph, ['master'], { token: 'token' });
    query(graph, ['slave'], { token: 'token' });

    master.subscribe(() => {}); // add a subscriber to "master"

    return new Promise((resolve, reject) => {
      // invalidate "master" after its cache has already expired
      setTimeout(() => {
        state.foo = 'foo_2';
        invalidate(graph, ['master'], { token: 'token' }) // invalidate later on

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
