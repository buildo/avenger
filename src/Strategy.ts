import { CacheValue } from './CacheValue';
import {
  Setoid,
  contramap as setoidContramap,
  fromEquals,
  strictEqual
} from 'fp-ts/lib/Setoid';
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
    readonly filter: Function1<CacheValue<L, P>, boolean>,
    readonly cacheValueSetoid: Setoid<CacheValue<L, P>>
  ) {}

  contramap<B>(f: (b: B) => A): Strategy<B, L, P> {
    return new Strategy(
      setoidContramap(f, this.inputSetoid),
      this.filter,
      this.cacheValueSetoid
    );
  }
}

export function fromSuccessFilter<A, L, P>(
  inputSetoid: Setoid<A>,
  filter: (value: P, updated: Date) => boolean,
  cacheValueSetoid: Setoid<CacheValue<L, P>>
): Strategy<A, L, P> {
  return new Strategy(
    inputSetoid,
    (cacheValue: CacheValue<L, P>) =>
      cacheValue.fold(constTrue, constTrue, constFalse, filter),
    cacheValueSetoid
  );
}

/**
 * A cache strategy builder that always return the cached value, if available
 *
 * @param inputSetoid A `Setoid` used to comopare input values when reading from the cache
 * @param cacheValueSetoid A `Setoid` used to compare `CacheValue`s when available in the cache
 */
export function available<A, L, P>(
  inputSetoid: Setoid<A>,
  cacheValueSetoid: Setoid<CacheValue<L, P>>
): Strategy<A, L, P> {
  return fromSuccessFilter(inputSetoid, constTrue, cacheValueSetoid);
}

/**
 * A cache strategy builder that always ignores the cached values and requests an update, re-fetching
 *
 * @param inputSetoid A `Setoid` used to comopare input values when reading from the cache
 * @param cacheValueSetoid A `Setoid` used to compare `CacheValue`s when available in the cache
 */
export function refetch<A, L, P>(
  inputSetoid: Setoid<A>,
  cacheValueSetoid: Setoid<CacheValue<L, P>>
): Strategy<A, L, P> {
  return fromSuccessFilter(inputSetoid, constFalse, cacheValueSetoid);
}

/**
 * Returns a cache strategy builder that returns the cached value up to `afterMs` milliseconds old,
 * if available, and otherwise re-fetches
 */
export function expire(afterMs: number) {
  return <A, L, P>(
    inputSetoid: Setoid<A>,
    cacheValueSetoid: Setoid<CacheValue<L, P>>
  ): Strategy<A, L, P> => {
    return fromSuccessFilter(
      inputSetoid,
      (_, updated) => updated.getTime() >= Date.now() - afterMs,
      cacheValueSetoid
    );
  };
}

export const setoidStrict = fromEquals(strictEqual);

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

export const setoidShallow = fromEquals(shallowEqual);

export type JSONObject = { [key: string]: JSON };
export interface JSONArray extends Array<JSON> {}
export type JSON =
  | null
  | undefined
  | string
  | number
  | boolean
  | JSONArray
  | JSONObject;

export function JSONEqual<A extends JSON>(a: A, b: A): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const setoidJSON = fromEquals<JSON>(JSONEqual);

function contramap<A, L, P, B>(
  fa: Strategy<A, L, P>,
  f: (b: B) => A
): Strategy<B, L, P> {
  return fa.contramap(f);
}

export const strategy: Contravariant3<URI> = {
  URI,
  contramap
};
