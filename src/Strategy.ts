import { CacheValue } from './CacheValue';
import { Option, none } from 'fp-ts/lib/Option';
import { Setoid } from 'fp-ts/lib/Setoid';
import { constant, Function1, identity } from 'fp-ts/lib/function';

export interface Strategy<A, L, P> {
  inputSetoid: Setoid<A>;
  filter: Function1<Option<CacheValue<L, P>>, Option<CacheValue<L, P>>>;
}

export function available<A, L, P>(inputSetoid: Setoid<A>): Strategy<A, L, P> {
  return {
    inputSetoid,
    filter: identity
  };
}

export function refetch<A, L, P>(inputSetoid: Setoid<A>): Strategy<A, L, P> {
  return {
    inputSetoid,
    filter: constant(none)
  };
}

export function expire(
  afterMs: number
): <A, L, P>(inputSetoid: Setoid<A>) => Strategy<A, L, P> {
  return inputSetoid => ({
    inputSetoid,
    filter: cacheValue =>
      cacheValue.filter(cv =>
        cv.fold(
          () => true,
          () => true,
          () => false,
          (_, updated) => updated.getTime() >= Date.now() - afterMs
        )
      )
  });
}
