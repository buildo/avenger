import {
  ObservableQuery,
  Fetch,
  compose,
  queryShallow,
  product,
  EnforceNonEmptyRecord,
  MakeStrategy
} from '../Query';

interface Queries extends Record<string, ObservableQuery<any, any, any>> {}

export function Query<
  D extends Queries,
  A = { [K in keyof D]: D[K]['_A'] },
  DL = { [K in keyof D]: D[K]['_L'] }[keyof D],
  DP = { [K in keyof D]: D[K]['_P'] }
>(dependencies: EnforceNonEmptyRecord<D>) {
  const master = product(dependencies);
  return <L, P>(fetch: Fetch<DP, L, P>) => (
    strategy: MakeStrategy<DP, L, P>
  ): ObservableQuery<A, L | DL, P> => {
    const slave = queryShallow(fetch, strategy);
    return compose(
      master,
      slave as any
    ) as any;
  };
}
