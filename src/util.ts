import { ObservableQuery } from './Query';

export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

// helpers from https://github.com/tycho01/typical
type MatchingPropNames<T, X> = {
  [K in keyof T]: T[K] extends X ? K : never;
}[keyof T];
type NonMatchingPropNames<T, X> = {
  [K in keyof T]: T[K] extends X ? never : K;
}[keyof T];

export type Simplify<T> = Pick<T, keyof T>;

export type ObservableQueries = Record<string, ObservableQuery<any, any, any>>;

export type VoidInputObservableQueries = Record<
  string,
  ObservableQuery<void, any, any>
>;

type _ProductA<R extends ObservableQueries> = Simplify<
  { [K in MatchingPropNames<R, ObservableQuery<void, any, any>>]?: never } &
    {
      [K in NonMatchingPropNames<
        R,
        ObservableQuery<void, any, any>
      >]: R[K]['_A'];
    }
>;

export type ProductA<R extends ObservableQueries> = NonMatchingPropNames<
  R,
  ObservableQuery<void, any, any>
> extends never
  ? void
  : _ProductA<R>;

export type ProductL<R extends ObservableQueries> = {
  [K in keyof R]: R[K]['_L'];
}[keyof R];

export type ProductP<R extends ObservableQueries> = {
  [K in keyof R]: R[K]['_P'];
};
