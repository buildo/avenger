import { Query, StateKey } from '../../src/types';

export default function(
  resolve = k => () => () => Promise.resolve(k)
) {
  const map = v => v;
  const safeCacheParamMap = v => StateKey.is(v) ? v : JSON.stringify(v);

  // queries layout, for reference:
  //
  //        A    F   H   I   J
  //      / | \ /         \ /
  //     C  |  B           K
  //     |  | /            |
  //     |  D              L
  //     | / \
  //     E    G

  const A = Query({
    id: 'A',
    cache: 'optimistic',
    fetch: resolve('A')
  });

  const F = Query({
    id: 'F',
    cache: 'manual',
    fetch: resolve('F')
  });

  const B = Query({
    id: 'B',
    cache: 'optimistic',
    cacheParams: {
      foo: safeCacheParamMap,
      bar: safeCacheParamMap
    },
    dependencies: {
      foo: {
        query: A,
        map
      },
      bar: {
        query: F,
        map
      }
    },
    fetch: resolve('B')
  });

  const C = Query({
    id: 'C',
    cacheParams: {
      foo: safeCacheParamMap
    },
    dependencies: {
      foo: {
        query: A,
        map
      }
    },
    fetch: resolve('C')
  });

  const D = Query({
    id: 'D',
    cacheParams: {
      foo: safeCacheParamMap,
      bar: safeCacheParamMap
    },
    dependencies: {
      foo: {
        query: A,
        map
      },
      bar: {
        query: B,
        map
      }
    },
    fetch: resolve('D')
  });

  const E = Query({
    id: 'E',
    cacheParams: {
      foo: safeCacheParamMap,
      bar: safeCacheParamMap
    },
    dependencies: {
      foo: {
        query: C,
        map
      },
      bar: {
        query: D,
        map
      }
    },
    fetch: resolve('E')
  });

  const G = Query({
    id: 'G',
    cacheParams: {
      foo: safeCacheParamMap
    },
    dependencies: {
      foo: {
        query: D,
        map
      }
    },
    fetch: resolve('G')
  });

  const H = Query({
    id: 'H',
    fetch: resolve('H')
  });

  const I = Query({
    id: 'I',
    fetch: () => () => Promise.resolve(['I1', 'I2', 'I3'])
  });

  const J = Query({
    id: 'J',
    fetch: resolve('J')
  });

  const K = Query({
    id: 'K',
    dependencies: {
      i: {
        query: I,
        map,
        multi: map
      },
      j: {
        query: J,
        map
      }
    },
    fetch: () => ({ i, j }) => Promise.resolve(`K ${i} ${JSON.stringify(j)}`)
  });

  const L = Query({
    id: 'L',
    dependencies: {
      k: {
        query: K,
        map
      }
    },
    fetch: () => ({ k }) => Promise.resolve(`L ${JSON.stringify(k)}`)
  });

  return {
    A, B, C, D, E, F, G,
    H,
    I, J, K, L
  };
}
