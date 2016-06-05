import t from 'tcomb';
import findKey from 'lodash/findKey';
import pick from 'lodash/pick';
import { apply } from '../query/apply';
import { ObservableCache } from '../query/ObservableCache';
import { refetch } from '../cache/strategies';
import { cacheFetch } from '../query/operators';
// import { compose, product } from '../fetch/operators';

function findP(inputOrGraph, f) {
  return findKey(inputOrGraph, ({ fetch }) => fetch === f);
}

function derivateA(inputOrGraph, P) {
  const possiblyNaked = inputOrGraph[P];
  return possiblyNaked.A || (() => {
    switch (possiblyNaked.fetch.type) {
      case 'composition':
        return derivateA(inputOrGraph, findP(inputOrGraph, possiblyNaked.fetch.master));
      case 'product':
        return possiblyNaked.fetch.fetches.map(f => derivateA(inputOrGraph, findP(inputOrGraph, f)));
      default:
        throw new Error(`missing A for naked '${P}'`);
    }
  })();
}

function pickA(AA, A) {
  if (t.list(t.String).is(A)) { // ['foo', 'bar']
    return pick(AA, A);
  } else {                      // [[1, 2], ['foo']]
    return A.map(a => pickA(AA, a));
  }
}

export function make(input) {
  return Object.keys(input).reduce((graph, P) => {
    const naked = input[P];
    const A = derivateA(graph, P);
    const dress = { A };

    // TODO(gio): prob. only atoms should be cached
    // we are caching everything anyway, otherwise `observe` complains
    // if (t.Nil.is(naked.fetch.type)) {
    const cache = new ObservableCache({ name: `${P}_${Math.random()}` }); // TODO(gio)
    dress.cachedFetch = cacheFetch(naked.fetch, naked.strategy || refetch, cache);
    // }

    return Object.assign(graph, {
      [P]: Object.assign({}, naked, dress)
    });
  }, Object.assign({}, input));
}

export function query(graph, Ps, A) {
  const queries = Ps.reduce((qs, P) => Object.assign(qs, {
    [P]: graph[P].cachedFetch || graph[P].fetch // only atoms could be cached
  }), {});
  const args = Ps.reduce((argz, P) => Object.assign(argz, {
    [P]: pickA(A, graph[P].A)
  }), {});

  return apply(queries, args);
}

// export function invalidate(graph, Ps, A) {
//
// }
