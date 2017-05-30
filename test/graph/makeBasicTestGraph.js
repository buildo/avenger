import { Query as Node } from '../../src/graph/QueryNode';
import { available } from '../../src/cache/strategies';
import { make } from '../../src/graph';

export default () => {
  const master = Node({
    id: 'master',
    params: { token: 'token' },
    fetch: ({ token }) => Promise.resolve({ bar: { foo: 'foo', token } })
  });
  const slave = Node({
    id: 'slave',
    strategy: available,
    dependencies: {
      master: { query: master }
    },
    fetch: ({ master: { bar } }) => Promise.resolve(bar)
  });
  const a = Node({
    id: 'a',
    strategy: available,
    fetch: () => Promise.resolve('a')
  });

  return make({ ...master, ...slave, ...a });
}
