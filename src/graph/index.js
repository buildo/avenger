import t from 'tcomb';
import findKey from 'lodash/findKey';
import pick from 'lodash/pick';
import { apply } from '../query/apply';
import { ObservableCache } from '../query/ObservableCache';
import { refetch } from '../cache/strategies';
import { cacheFetch } from '../query/operators';
import { compose, product } from '../fetch/operators';

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

// TODO(gio): prob. only atom parts of this tree should be cached, verify this holds true
function asCached(inputOrGraph, fetch, P, strategy) {
  if (inputOrGraph[P] && t.Function.is(inputOrGraph[P].cachedFetch)) {
    // TODO(gio): this case could go away?
    return inputOrGraph[P].cachedFetch;
  }

  if (t.Nil.is(fetch.type)) {
    // TODO(gio): random should go away after tests
    const cache = new ObservableCache({ name: `${P}_${Math.random()}` });
    return cacheFetch(fetch, strategy || refetch, cache);
  }

  if (!t.Nil.is(fetch.type)) {
    let fc;
    // this is a composition or product (possibly?) given in terms
    // of "naked" fetches. We should reconstruct the same "tree"
    // but using `cachedFetch`es along the way
    if (fetch.type === 'composition') {
      const masterP = findP(inputOrGraph, fetch.master);
      const slaveP = findP(inputOrGraph, fetch.slave);
      fc = compose(
        asCached(inputOrGraph, fetch.master, masterP, strategy),
        fetch.ptoa,
        asCached(inputOrGraph, fetch.slave, slaveP, strategy)
      );
    } else { // fetch.type === 'product'
      fc = product(
        fetch.fetches.map(f => asCached(inputOrGraph, f, findP(inputOrGraph, f), strategy))
      );
    }
    const cache = new ObservableCache({ name: `${P}_${Math.random()}` });
    return cacheFetch(fc, strategy || refetch, cache);
  }
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
    const cachedFetch = asCached(graph, naked.fetch, P, naked.strategy);
    const dress = { A, cachedFetch };

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
