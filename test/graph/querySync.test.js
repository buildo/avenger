import 'rxjs'
import { make, query, querySync } from '../../src/graph';
import { available } from '../../src/cache/strategies';
import Node from './Node'

const makeTestGraph = () => {
  const master = Node({
    id: 'master',
    params: { token: 'token' },
    fetch: () => Promise.resolve({ bar: { foo: 'foo' } })
  });
  const slave = Node({
    id: 'slave',
    strategy: available,
    dependencies: {
      master: { query: master }
    },
    fetch: ({ master: { bar } }) => Promise.resolve(bar)
  })
  const a = Node({
    id: 'a',
    strategy: available,
    fetch: () => Promise.resolve('a')
  })
  const b = Node({
    id: 'b',
    strategy: available,
    fetch: () => Promise.resolve('b')
  })

  return make({ ...master, ...slave, ...a, ...b });
}

describe('queriesSync', () => {

  it('should return complete structure even when no value is available', () => {
    const graph = makeTestGraph()

    const master = querySync(graph, ['master'], { token: 'token' })
    const slave = querySync(graph, ['slave'], { token: 'token' })
    const product = querySync(graph, ['a', 'b'], { token: 'token' })

    expect(master).toEqual({ master: {} })
    expect(slave).toEqual({ slave: { loading: true } })
    expect(product).toEqual({ a: {}, b: {} })
  });

  it('should return current value', () => {
    const graph = makeTestGraph()

    query(graph, ['master'], { token: 'token' })
    query(graph, ['slave'], { token: 'token' })
    query(graph, ['a', 'b'], { token: 'token' })

    return new Promise((resolve, reject) => setTimeout(() => {
      const master = querySync(graph, ['master'], { token: 'token' })
      const slave = querySync(graph, ['slave'], { token: 'token' })
      const product = querySync(graph, ['a', 'b'], { token: 'token' })

      try {
        expect(master).toEqual({ master: { loading: false, data: { bar: { foo: 'foo' } } } })
        expect(slave).toEqual({ slave: { loading: false, data: { foo: 'foo' } } })
        expect(product).toEqual({ a: { loading: false, data: 'a' }, b: { loading: false, data: 'b' } })
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 10))
  });

});
