import { CacheValue } from './CacheValue';
import { Setoid } from 'fp-ts/lib/Setoid';
import { Function1, constTrue, constFalse } from 'fp-ts/lib/function';

export interface Strategy<A, L, P> {
  inputSetoid: Setoid<A>;
  filter: Function1<CacheValue<L, P>, boolean>;
}

export function fromSuccessFilter<A, L, P>(
  inputSetoid: Setoid<A>,
  filter: (value: P, updated: Date) => boolean
): Strategy<A, L, P> {
  return {
    inputSetoid,
    filter: cacheValue =>
      cacheValue.fold(constTrue, constTrue, constFalse, filter)
  };
}

export function available<A, L, P>(inputSetoid: Setoid<A>): Strategy<A, L, P> {
  return fromSuccessFilter(inputSetoid, constTrue);
}

export function refetch<A, L, P>(inputSetoid: Setoid<A>): Strategy<A, L, P> {
  return fromSuccessFilter(inputSetoid, constFalse);
}

export function expire(afterMs: number) {
  return <A, L, P>(inputSetoid: Setoid<A>): Strategy<A, L, P> => {
    return fromSuccessFilter(
      inputSetoid,
      (_, updated) => updated.getTime() >= Date.now() - afterMs
    );
  };
}
