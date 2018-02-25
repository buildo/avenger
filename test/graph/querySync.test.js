import 'rxjs'
import { query, querySync } from '../../src/graph';
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
    dependencies: { master },
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

  return { master, slave, a, b };
}

describe('queriesSync', () => {

  it('should return complete structure even when no value is available', () => {
    const { master, slave, a, b } = makeTestGraph();

    const masterSync = querySync({ master }, { token: 'token' })
    const slaveSync = querySync({ slave }, { token: 'token' })
    const productSync = querySync({ a, b }, { token: 'token' })

    expect(masterSync).toEqual({ data: { master: { loading: false } }, loading: false })
    expect(slaveSync).toEqual({ data: { slave: { loading: true } }, loading: true })
    expect(productSync).toEqual({ data: { a: { loading: false }, b: { loading: false } }, loading: false })
  });

  it('should return "loading: true" when queries are loading', () => {
    const { master, slave, a, b } = makeTestGraph()

    query({ master }, { token: 'token' })
    query({ slave }, { token: 'token' })
    query({ a, b }, { token: 'token' })

    const masterSync = querySync({ master }, { token: 'token' })
    const slaveSync = querySync({ slave }, { token: 'token' })
    const productSync = querySync({ a, b }, { token: 'token' })

    expect(masterSync).toEqual({ data: { master: { loading: true } }, loading: true })
    expect(slaveSync).toEqual({ data: { slave: { loading: true } }, loading: true })
    expect(productSync).toEqual({ data: { a: { loading: true }, b: { loading: true } }, loading: true })
  });

  it('should return current value', () => {
    const { master, slave, a, b } = makeTestGraph();

    query({ master }, { token: 'token' })
    query({ slave }, { token: 'token' })
    query({ a, b }, { token: 'token' })

    return new Promise((resolve, reject) => setTimeout(() => {
      const masterSync = querySync({ master }, { token: 'token' })
      const slaveSync = querySync({ slave }, { token: 'token' })
      const productSync = querySync({ a, b }, { token: 'token' })

      try {
        expect(masterSync).toEqual({ data: { master: { loading: false, data: { bar: { foo: 'foo' } } } }, loading: false })
        expect(slaveSync).toEqual({ data: { slave: { loading: false, data: { foo: 'foo' } } }, loading: false })
        expect(productSync).toEqual({ data: { a: { loading: false, data: 'a' }, b: { loading: false, data: 'b' } }, loading: false })
        resolve();
      } catch (e) {
        reject(e);
      }
    }, 10))
  });

});
