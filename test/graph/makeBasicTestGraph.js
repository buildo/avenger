import { Query as Node } from '../../src/graph/QueryNode';
import { available } from '../../src/cache/strategies';

export default () => {
  const master = Node({
    id: 'master',
    params: { token: 'token' },
    fetch: ({ token }) => Promise.resolve({ bar: { foo: 'foo', token } })
  });
  const slave = Node({
    id: 'slave',
    strategy: available,
    params: { slaveToken: 'slaveToken' },
    dependencies: {
      master: { query: master }
    },
    fetch: ({ master: { bar }, slaveToken }) => Promise.resolve({ ...bar, slaveToken })
  });
  const a = Node({
    id: 'a',
    strategy: available,
    fetch: () => Promise.resolve('a')
  });

  return { master, slave, a };
}
