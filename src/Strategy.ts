import * as CV from './CacheValue';
import * as Eq from 'fp-ts/lib/Eq';
import { constTrue, constFalse } from 'fp-ts/lib/function';

declare module 'fp-ts/lib/HKT' {
  interface URItoKind3<R, E, A> {
    Strategy: Strategy<R, E, A>;
  }
}

export const URI = 'Strategy';

export type URI = typeof URI;

export interface Strategy<R, E, A> {
  readonly inputEq: Eq.Eq<R>;
  readonly filter: (cacheValue: CV.CacheValue<E, A>) => boolean;
  readonly cacheValueEq: Eq.Eq<CV.CacheValue<E, A>>;
}

export function fromSuccessFilter<R, E, A>(
  inputEq: Eq.Eq<R>,
  filter: (value: A, updated: Date) => boolean,
  cacheValueEq: Eq.Eq<CV.CacheValue<E, A>>
): Strategy<R, E, A> {
  return {
    inputEq,
    filter: CV.fold(constTrue, constTrue, constFalse, filter),
    cacheValueEq
  };
}

/**
 * A cache strategy builder that always return the cached value, if available
 *
 * @param inputEq An `Eq` used to comopare input values when reading from the cache
 * @param cacheValueEq An `Eq` used to compare `CacheValue`s when available in the cache
 */
export function available<R, E, A>(
  inputEq: Eq.Eq<R>,
  cacheValueEq: Eq.Eq<CV.CacheValue<E, A>>
): Strategy<R, E, A> {
  return fromSuccessFilter(inputEq, constTrue, cacheValueEq);
}

/**
 * A cache strategy builder that always ignores the cached values and requests an update, re-fetching
 *
 * @param inputEq An `Eq` used to comopare input values when reading from the cache
 * @param cacheValueEq An `Eq` used to compare `CacheValue`s when available in the cache
 */
export function refetch<R, E, A>(
  inputEq: Eq.Eq<R>,
  cacheValueEq: Eq.Eq<CV.CacheValue<E, A>>
): Strategy<R, E, A> {
  return fromSuccessFilter(inputEq, constFalse, cacheValueEq);
}

/**
 * Returns a cache strategy builder that returns the cached value up to `afterMs` milliseconds old,
 * if available, and otherwise re-fetches
 */
export function expire(afterMs: number) {
  return <R, E, A>(
    inputEq: Eq.Eq<R>,
    cacheValueEq: Eq.Eq<CV.CacheValue<E, A>>
  ): Strategy<R, E, A> => {
    return fromSuccessFilter(
      inputEq,
      (_, updated) => updated.getTime() >= Date.now() - afterMs,
      cacheValueEq
    );
  };
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

export const eqShallow = Eq.fromEquals(shallowEqual);

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

export const eqJSON = Eq.fromEquals<JSON>(JSONEqual);

export const strategy = {
  URI
};
