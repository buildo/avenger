import { Query, StateKey } from '../../src/types';

export default function(
  resolve = k => () => () => Promise.resolve(k)
) {
  const map = v => v;
  const safeCacheParamMap = v => StateKey.is(v) ? v : JSON.stringify(v);

  // queries layout, for reference:
  //
  //        A    F   H
  //      / | \ /
  //     C  |  B
  //     |  | /
  //     |  D
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

  return { A, B, C, D, E, F, G, H };
}
