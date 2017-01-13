/* global describe,it */
import assert from 'assert'
import 'rxjs'
import Node from './Node'
import { make, invalidate, query } from '../../src/graph';
import { Expire, available } from '../../src/cache/strategies';

let foo = 'foo';
const makeTestGraph = () => {
  const configuration = Node({
    id: 'configuration',
    strategy: new Expire(100),
    params: { token: true },
    fetch: () => new Promise(resolve => {
      setTimeout(() => resolve({ user: { foo } }))
    })
  })
  const userConfiguration = Node({
    id: 'userConfiguration',
    strategy: available,
    dependencies: {
      config: { query: configuration }
    },
    fetch: ({ config: { user } }) => new Promise(resolve => {
      setTimeout(() => resolve(user))
    })
  })

  return make({ ...configuration, ...userConfiguration });
}

const log = r => console.log(JSON.stringify(r, null, 2));

describe('graph/deps', () => {

  it('should work', (done) => {

    const graph = makeTestGraph()

    const userConfiguration = query(graph, ['userConfiguration'], { token: 'lol' })

    userConfiguration.subscribe((r) => {
      log(r)
    }) // add a subscriber

    setTimeout(() => {
      foo = 'bar';
      invalidate(graph, ['configuration'], { token: 'lol' }) // invalidate later on
      setTimeout(done, 200)
    }, 200);

  });

});