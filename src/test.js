import t from 'tcomb';
import identity from 'lodash/utility/identity';
import mkAvenger from './index';
import { Query } from './types';

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
      console.log('>> resolveLater', v);
      resolve(v);
    }, Math.random() * 1000);
  });
};
const a = Query({ // no dep
  id: 'a',
  // cacheStrategy: 'optimistic',
  params: { token: t.String },
  fetch: s => resolveLater(`fetched a+${JSON.stringify(s)}`)()
});
const b = Query({ // no dep
  id: 'b',
  cacheStrategy: 'optimistic',
  fetch: resolveLater(`b`)
});
const c = Query({ // single dep
  id: 'c',
  cacheStrategy: 'optimistic',
  dependencies: {
    aaa: {
      query: a,
      map: v => `mapped ${v}`
    }
  },
  params: { aaa: t.String },
  fetch: ({ aaa }) => resolveLater(`from c ${aaa}`)()
});
const d = Query({ // multi dep
  id: 'd',
  cacheStrategy: 'optimistic',
  dependencies: {
    aaa: {
      query: a,
      map: v => `mapped ${v}`
    },
    b: {
      query: b
    }
  },
  params: { aaa: t.String, b: t.String },
  fetch: ({ aaa, b }) => resolveLater(`from d ${aaa} ${b}`)()
});
const universe = { a, b, c, d };
const av = mkAvenger(universe);

// console.log(av.addQuery('a', { token: 'baz' }) === av.addQuery('a', { token: 'baz' }));
// av.addQuery('a', { token: 'foo' }).subscribe(log0('addQuery a { token: "foo" }'));
// av.addQuery('a', { token: 'bar' }).subscribe(log0('addQuery a { token: "bar" }'));
// av.addQuery('c', { token: 'bar' }).subscribe(log0('addQuery c { token: "bar" }'));
// av.addQuery('d', { token: 'bar' }).subscribe(log0('1 addQuery d { token: "bar" }'));
// setTimeout(() => {
//   av.addQuery('d', { token: 'bar' }).subscribe(log0('2 addQuery d { token: "bar" }'));
// }, 2000);
// av.addQuery('a', { token: 'bar' }).subscribe(log0('addQuery a { token: "bar" }'));
// setTimeout(() => {
//   av.addQuery('a', { token: 'bar' }).subscribe(log0('addQuery a { token: "bar" }'));
// }, 2000);
av.addQueries({ a: { token: 'bar' }, d: { token: 'baz' } }).subscribe(log1('addQueries'));
// av.addQuery('a', { token: 'bar' }).subscribe(log1('addQuery'));
setTimeout(() => {
  av.addQueries({ a: { token: 'bar' }, d: { token: 'baz' } }).subscribe(log1('addQueries'));
}, 4000);

// av.$graph.subscribe(log2('$graph'), ::console.error);
// av.$value.subscribe(log1('$value'), ::console.error);
// av.$stableValue.subscribe(log1('$stableValue'), ::console.error);
// av.$readyState.subscribe(log2('$readyState'), ::console.error);
// av.$readyState.map(rs => rs.a || {}).subscribe(log1('a $readyState'), ::console.error);

// av.setState({ token: 'lol', foo: 'baz' });
// av.addQuery('d');
// av.addQuery('b');//.subscribe(log0('b $distinctValue'));
// av.addQueries(['b', 'c', 'd']).subscribe(({ readyState, ...vals }) => {
//   log1('b,c,d $distinct value')(vals);
//   log2('b,c,d $distinct rs')(readyState);
// });
// av.addQuery('c');
// av.setState({ token: 'lol', foo: 'baz' });
// av.removeQueries(['a', 'b']);
// av.addQuery('b');
// setTimeout(() => {
//   av.setState({ token: 'lo', foo: 'bar' });
//   // av.invalidateQuery('a');
//   setTimeout(() => {
//     av.setState({ token: 'lol', foo: 'baz' });
//   }, 500);
// }, 500);
