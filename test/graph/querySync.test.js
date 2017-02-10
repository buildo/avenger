import 'rxjs'
import { make, query, querySync } from '../../src/graph';
import { available } from '../../src/cache/strategies';
import { Query as Node } from '../../src/graph/QueryNode'

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

    expect(master).toEqual({ data: { master: { loading: false } }, loading: false })
    expect(slave).toEqual({ data: { slave: { loading: true } }, loading: true })
    expect(product).toEqual({ data: { a: { loading: false }, b: { loading: false } }, loading: false })
  });

  it('should return "loading: true" when queries are loading', () => {
    const graph = makeTestGraph()

    query(graph, ['master'], { token: 'token' })
    query(graph, ['slave'], { token: 'token' })
    query(graph, ['a', 'b'], { token: 'token' })

    const master = querySync(graph, ['master'], { token: 'token' })
    const slave = querySync(graph, ['slave'], { token: 'token' })
    const product = querySync(graph, ['a', 'b'], { token: 'token' })

    expect(master).toEqual({ data: { master: { loading: true } }, loading: true })
    expect(slave).toEqual({ data: { slave: { loading: true } }, loading: true })
    expect(product).toEqual({ data: { a: { loading: true }, b: { loading: true } }, loading: true })
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
        expect(master).toEqual({ data: { master: { loading: false, data: { bar: { foo: 'foo' } } } }, loading: false })
        expect(slave).toEqual({ data: { slave: { loading: false, data: { foo: 'foo' } } }, loading: false })
        expect(product).toEqual({ data: { a: { loading: false, data: 'a' }, b: { loading: false, data: 'b' } }, loading: false })
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 10))
  });

});
