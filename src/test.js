import t from 'tcomb';
import identity from 'lodash/utility/identity';
import mkAvenger from './index';
import { Query, Command } from './types';

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
const sample = Query({
  id: 'sample',
  cacheStrategy: 'optimistic',
  params: { sampleId: t.String },
  fetch: ({ sampleId }) => resolveLater({ _requestId: `request-${sampleId}` })()
});
const sampleRequest = Query({
  id: 'sampleRequest',
  cacheStrategy: 'optimistic',
  dependencies: {
    requestId: {
      query: sample,
      map: ({ _requestId }) => _requestId
    }
  },
  params: {},
  fetch: ({ requestId }) => resolveLater({ requestId })()
});
const universe = { a, b, c, d, sample, sampleRequest };
const av = mkAvenger(universe);

const cmd1 = Command({
  id: 'cmd1',
  invalidates: { sampleRequest },
  params: { howMuch: t.String },
  run: resolveLater({})
});

av.error.subscribe(log1('error'));

// console.log(d.upsetParams);
// console.log(d.upsetLeavesParams);
// console.log(d.upsetActualParams);

// av.query('a', { token: 'foo' }).subscribe(log0('query a { token: "foo" }'));
// av.query('a', { token: 'bar' }).subscribe(log0('query a { token: "bar" }'));
// av.query('c', { token: 'bar' }).subscribe(log0('query c { token: "bar" }'));
// av.query('d', { token: 'bar' }).subscribe(log0('1 query d { token: "bar" }'));
// setTimeout(() => {
//   av.query('d', { token: 'bar' }).subscribe(log0('2 query d { token: "bar" }'));
// }, 2000);
// av.query('a', { token: 'bar' }).subscribe(log0('query a { token: "bar" }'));
// setTimeout(() => {
//   av.query('a', { token: 'bar' }).subscribe(log0('query a { token: "bar" }'));
// }, 2000);
// av.queries({ a: { token: 'bar' }, d: { token: 'baz' } }).subscribe(log1('queries'));
// av.query('a', { token: 'bar' }).subscribe(log1('query'));
// setTimeout(() => {
//   av.queries({ a: { token: 'bar' }, d: { token: 'baz' } }).subscribe(log1('queries'));
// }, 4000);
// av.query('b', {}).subscribe(({ readyState, ...value }) => {
//   log2('b readyState')(readyState);
//   log1('b value')(value);
// });
// av.query('d', { token: 'foo' }).subscribe(({ readyState, ...value }) => {
//   log2('1 d readyState')(readyState);
//   log1('1 d value')(value);
// });
// setTimeout(() => {
//   console.log('-------------------------');
//   av.invalidateQuery('d', { token: 'foo' });
// }, 3000);
// setTimeout(() => {
//   console.log('---------------');
//   av.query('d', { token: 'foo' }).subscribe(({ readyState, ...value }) => {
//     log2('2 d readyState')(readyState);
//     log1('2 d value')(value);
//   });
// }, 5000);
av.queries({ sample: { sampleId: 'one' }, sampleRequest: { sampleId: 'one' } }).subscribe(({ readyState, ...value }) => {
  log2('readyState')(readyState);
  // log1('value')(value);
});
setTimeout(() => {
  console.log('-----------------');
  // av.queries({ sample: { sampleId: 'one' }, sampleRequest: { sampleId: 'one' } }).subscribe(({ readyState, ...value }) => {
  //   log2('readyState')(readyState);
  //   // log1('value')(value);
  // });
  av.runCommand(cmd1, { howMuch: 'much', sampleId: 'one' });
}, 3000);

// av.$graph.subscribe(log2('$graph'), ::console.error);
// av.$value.subscribe(log1('$value'), ::console.error);
// av.$stableValue.subscribe(log1('$stableValue'), ::console.error);
// av.$readyState.subscribe(log2('$readyState'), ::console.error);
// av.$readyState.map(rs => rs.a || {}).subscribe(log1('a $readyState'), ::console.error);

// av.setState({ token: 'lol', foo: 'baz' });
// av.query('d');
// av.query('b');//.subscribe(log0('b $distinctValue'));
// av.queries(['b', 'c', 'd']).subscribe(({ readyState, ...vals }) => {
//   log1('b,c,d $distinct value')(vals);
//   log2('b,c,d $distinct rs')(readyState);
// });
// av.query('c');
// av.setState({ token: 'lol', foo: 'baz' });
// av.removeQueries(['a', 'b']);
// av.query('b');
// setTimeout(() => {
//   av.setState({ token: 'lo', foo: 'bar' });
//   // av.invalidateQuery('a');
//   setTimeout(() => {
//     av.setState({ token: 'lol', foo: 'baz' });
//   }, 500);
// }, 500);
