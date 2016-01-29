import t from 'tcomb';
import identity from 'lodash/utility/identity';
import mkAvenger from './index';

const log0 = l => v => {
  console.log(`> ${l}:`);
  console.log(v);
};

const log1 = l => o => {
  console.log(`> ${l}:`);
  console.log(Object.keys(o).map(k => `${k}:: ${o[k]}`).join('\n') + '\n');
};

const log2 = l => o => {
  console.log(`> ${l}:`);
  console.log(Object.keys(o).map(k => {
    const oo = o[k];
    return `${k} :: ` + Object.keys(oo).map(kk => `${kk}: ${oo[kk] === null ? '  - ' : oo[kk]}`).join(', ');
  }).join('\n') + '\n');
};

const resolveLater = v => () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(v);
    }, Math.random() * 100);
  });
};
const universe = {
  a: {
    id: 'a',
    cacheStrategy: 'optimistic',
    params: { token: t.String },
    fetch: s => {
      return resolveLater(`fetched a+${JSON.stringify(s)}`)();
    }
  },
  b: {
    id: 'b',
    params: { foo: t.String },
    fetch: resolveLater('fetched b')
  },
  c: {
    id: 'c',
    params: { a: t.String },
    fetch: resolveLater('fetched c')
  },
  d: {
    id: 'd',
    params: { foo: t.String },
    fetch: () => Promise.reject('d error')
  }
};
universe.c.dependencies = { a: { query: universe.a } };
const av = mkAvenger(universe);

// av.$graph.subscribe(log2('$graph'), ::console.error);
// av.$value.subscribe(log1('$value'), ::console.error);
// av.$stableValue.subscribe(log1('$stableValue'), ::console.error);
av.$readyState.subscribe(log2('$readyState'), ::console.error);
// av.$readyState.map(rs => rs.a || {}).subscribe(log1('a $readyState'), ::console.error);

av.setState({ token: 'lol', foo: 'baz' });
av.addQuery('d');
// av.addQuery('b');//.subscribe(log0('b $distinctValue'));
// av.addQueries(['b', 'c', 'd']).subscribe(({ readyState, ...vals }) => {
//   log1('b,c,d $distinct value')(vals);
//   log2('b,c,d $distinct rs')(readyState);
// });
// av.addQuery('c');
// av.setState({ token: 'lol', foo: 'baz' });
// av.removeQueries(['a', 'b']);
// av.addQuery('b');
setTimeout(() => {
  av.setState({ token: 'lo', foo: 'bar' });
  // av.invalidateQuery('a');
  setTimeout(() => {
    av.setState({ token: 'lol', foo: 'baz' });
  }, 500);
}, 500);
