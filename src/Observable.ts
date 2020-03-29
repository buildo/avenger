import { Alternative1 } from 'fp-ts/lib/Alternative';
import { Monad1 } from 'fp-ts/lib/Monad';
import { Monoid } from 'fp-ts/lib/Monoid';
import { combineLatest, EMPTY, merge, Observable, of as rxOf } from 'rxjs';
import { map as rxMap, switchMap } from 'rxjs/operators';
import { pipeable } from 'fp-ts/lib/pipeable';
import { constant } from 'fp-ts/lib/function';

declare module 'rxjs/internal/Observable' {
  interface Observable<T> {
    readonly _URI: URI;
    readonly _A: T;
  }
}

declare module 'fp-ts/lib/HKT' {
  interface URItoKind<A> {
    Observable: Observable<A>;
  }
}

export const URI = 'Observable';

export type URI = typeof URI;

export const observable: Monad1<URI> & Alternative1<URI> = {
  URI,
  map: (fa, f) => fa.pipe(rxMap(f)),
  of: rxOf,
  ap: (fab, fa) => combineLatest(fab, fa, (f, a) => f(a)),
  chain: (fa, f) => fa.pipe(switchMap(f)),
  zero: constant(EMPTY),
  alt: (x, y) => merge(x, y())
};

const {
  alt,
  ap,
  apFirst,
  apSecond,
  chain,
  chainFirst,
  flatten,
  map
} = pipeable(observable);

export { alt, ap, apFirst, apSecond, chain, chainFirst, flatten, map };

export const getMonoid = <A = never>(): Monoid<Observable<A>> => {
  return {
    concat: (x, y) => merge(x, y),
    empty: EMPTY
  };
};
