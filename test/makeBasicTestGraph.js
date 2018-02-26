import { Query as Node, available } from '../src';

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
    dependencies: { master },
    fetch: ({ master: { bar }, slaveToken }) => Promise.resolve({ ...bar, slaveToken })
  });
  const a = Node({
    id: 'a',
    strategy: available,
    fetch: () => Promise.resolve('a')
  });

  return { master, slave, a };
}
