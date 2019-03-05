import { Fetch, ObservableQuery } from './Query';
import { invalidate } from './invalidate';

export function command<
  A,
  L,
  P,
  I extends Record<string, ObservableQuery<any, any, any>>,
  IL extends { [k in keyof I]: I[k]['_L'] }[keyof I],
  IA extends { [k in keyof I]: I[k]['_A'] }
>(cmd: Fetch<A, L, P>, queries: I): Fetch<[A, IA], L | IL, P> {
  return ([a, ia]) =>
    (cmd as Fetch<A, L | IL, P>)(a).chain(p =>
      invalidate(queries, ia).map(() => p)
    );
}
