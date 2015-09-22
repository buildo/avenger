import t from 'tcomb';
import { Query, StateKey } from '../../src/types';

export default function(
  resolve = k => () => () => Promise.resolve(k)
) {
  const safeCacheParamMap = v => StateKey.is(v) ? v : JSON.stringify(v);
  const map = safeCacheParamMap;

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
      foo: t.Str,
      bar: t.Str,
      s1: t.Str,
      more: t.Any
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
      foo: t.Str
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
    cache: 'manual',
    cacheParams: {
      foo: t.Str,
      bar: t.Str
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
    cache: 'optimistic',
    cacheParams: {
      foo: t.Str,
      bar: t.Str
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
    cacheParams: {},
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


  // multi queries layout:
  //
  //    I   J
  //     \ /
  //      K
  //      |
  //      L
  //

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
        map: v => v,
        multi: v => v
      },
      j: {
        query: J,
        map
      }
    },
    fetch: () => ({ i, j }) => Promise.resolve(`K ${i} ${j}`)
  });

  const L = Query({
    id: 'L',
    dependencies: {
      k: {
        query: K,
        map
      }
    },
    fetch: () => ({ k }) => Promise.resolve(`L ${k}`)
  });

  const M = Query({
    id: 'M',
    cache: 'manual',
    cacheParams: {
      a: t.Str
    },
    fetch: resolve('M')
  });

  const N = Query({
    id: 'N',
    cache: 'manual',
    cacheParams: {
      n: t.Str,
      m: t.Str
    },
    dependencies: {
      m: {
        query: M,
        map
      }
    },
    fetch: resolve('N')
  });

  const O = Query({
    id: 'O',
    cache: 'manual',
    cacheParams: {
      o: t.Str
    },
    dependencies: {
      m: {
        query: M,
        map
      }
    },
    fetch: resolve('O')
  });

  return {
    A, B, C, D, E, F, G,
    H,
    I, J, K, L,
    M, N, O
  };
}
