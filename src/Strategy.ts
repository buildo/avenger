import { CacheValue } from './CacheValue';
import { Setoid, contramap as setoidContramap } from 'fp-ts/lib/Setoid';
import { Function1, constTrue, constFalse } from 'fp-ts/lib/function';
import { Contravariant3 } from 'fp-ts/lib/Contravariant';

declare module 'fp-ts/lib/HKT' {
  interface URI2HKT3<U, L, A> {
    Strategy: Strategy<A, L, U>;
  }
}

export const URI = 'Strategy';

export type URI = typeof URI;

export class Strategy<A, L, P> {
  readonly _A!: A;
  readonly _L!: L;
  readonly _P!: P;
  readonly _URI!: URI;
  constructor(
    readonly inputSetoid: Setoid<A>,
    readonly filter: Function1<CacheValue<L, P>, boolean>
  ) {}

  contramap<B>(f: (b: B) => A): Strategy<B, L, P> {
    return new Strategy(setoidContramap(f, this.inputSetoid), this.filter);
  }
}

export function fromSuccessFilter<A, L, P>(
  inputSetoid: Setoid<A>,
  filter: (value: P, updated: Date) => boolean
): Strategy<A, L, P> {
  return new Strategy(inputSetoid, (cacheValue: CacheValue<L, P>) =>
    cacheValue.fold(constTrue, constTrue, constFalse, filter)
  );
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

function contramap<A, L, P, B>(
  fa: Strategy<A, L, P>,
  f: (b: B) => A
): Strategy<B, L, P> {
  return fa.contramap(f);
}

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b)) {
    return true;
  }
  if ((a == null && b != null) || (a != null && b == null)) {
    return false;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    for (let k in a) {
      if ((a as any)[k] !== (b as any)[k]) {
        return false;
      }
    }
    for (let k in b) {
      if ((a as any)[k] !== (b as any)[k]) {
        return false;
      }
    }
    return true;
  }
  return false;
}

export type JSONObject = { [key: string]: JSON };
export interface JSONArray extends Array<JSON> {}
export type JSON = null | string | number | boolean | JSONArray | JSONObject;

export function JSONStringifyEqual<A extends JSON>(a: A, b: A): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const strategy: Contravariant3<URI> = {
  URI,
  contramap
};
