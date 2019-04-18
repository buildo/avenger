import { ObservableQuery } from './Query';

export type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

export type Omit<O, K> = Pick<O, Exclude<keyof O, K>>;

// helpers from https://github.com/tycho01/typical
type MatchingPropNames<T, X> = {
  [K in keyof T]: T[K] extends X ? K : never
}[keyof T];
type NonMatchingPropNames<T, X> = {
  [K in keyof T]: T[K] extends X ? never : K
}[keyof T];

export type Simplify<T> = Pick<T, keyof T>;

export type ObservableQueries = Record<string, ObservableQuery<any, any, any>>;

export type VoidInputObservableQueries = Record<
  string,
  ObservableQuery<void, any, any>
>;

export type ProductA<R extends ObservableQueries> = Simplify<
  { [K in MatchingPropNames<R, ObservableQuery<void, any, any>>]?: never } &
    {
      [K in NonMatchingPropNames<
        R,
        ObservableQuery<void, any, any>
      >]: R[K]['_A']
    }
>;
