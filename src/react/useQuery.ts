import { useEffect, useState, useMemo } from 'react';
import { ObservableQuery, product } from '../Query';
import { QueryResult, loading, success } from '../QueryResult';
import { observeShallow } from '../observe';
import { Monoid } from 'fp-ts/lib/Monoid';
import { observable } from '../Observable';
import {
  ObservableQueries,
  EnforceNonEmptyRecord,
  ProductA,
  ProductL,
  ProductP,
  VoidInputObservableQueries
} from '../util';

/**
 * React hook to `observe` an `ObservableQuery`
 * @param query The ObservableQuery to observe
 * @param resultMonoid A monoid used to aggregate `QueryResult` payloads
 * @param input Input for the observed query
 */
export function useQueryMonoid<A extends void, L, P>(
  query: ObservableQuery<A, L, P>,
  resultMonoid: Monoid<QueryResult<L, P>>,
  input?: A
): QueryResult<L, P>;
export function useQueryMonoid<A, L, P>(
  query: ObservableQuery<A, L, P>,
  resultMonoid: Monoid<QueryResult<L, P>>,
  input: A
): QueryResult<L, P>;
export function useQueryMonoid<A, L, P>(
  query: ObservableQuery<A, L, P>,
  resultMonoid: Monoid<QueryResult<L, P>>,
  input: A
): QueryResult<L, P> {
  const [state, setState] = useState<QueryResult<L, P>>(resultMonoid.empty);

  useEffect(() => {
    const subscription = observable
      .map(observeShallow(query, input), r => resultMonoid.concat(state, r))
      .subscribe(setState);
    return subscription.unsubscribe.bind(subscription);
  }, [input, query, setState]);

  return state;
}

export function defaultMonoidResult<L, P>() {
  return {
    empty: loading,
    concat: (a: QueryResult<L, P>, b: QueryResult<L, P>) =>
      a.type === 'Success' && b.type === 'Loading'
        ? success<L, P>(a.value, true)
        : b
  };
}

/**
 * React hook to `observe` an `ObservableQuery` using the default aggregation strategy for subsequent `QueryResult` payloads
 * @param query The ObservableQuery to observe
 * @param input Input for the observed query
 */
export function useQuery<A extends void, L, P>(
  query: ObservableQuery<A, L, P>,
  input?: A
): QueryResult<L, P>;
export function useQuery<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A
): QueryResult<L, P>;
export function useQuery<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A
): QueryResult<L, P> {
  return useQueryMonoid(query, defaultMonoidResult<L, P>(), input);
}

/**
 * React hook to `observe` a record of observable queries
 * @param query The record of queries to observe
 * @param resultMonoid A monoid used to aggregate `QueryResult` payloads
 * @param input Input for the observed queries
 */
export function useQueriesMonoid<R extends VoidInputObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  resultMonoid: Monoid<QueryResult<ProductL<R>, ProductP<R>>>,
  input?: ProductA<R>
): QueryResult<ProductL<R>, ProductP<R>>;
export function useQueriesMonoid<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  resultMonoid: Monoid<QueryResult<ProductL<R>, ProductP<R>>>,
  input: ProductA<R>
): QueryResult<ProductL<R>, ProductP<R>>;
export function useQueriesMonoid<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  resultMonoid: Monoid<QueryResult<ProductL<R>, ProductP<R>>>,
  input?: ProductA<R>
): QueryResult<ProductL<R>, ProductP<R>> {
  const queryProduct = useMemo(() => product(queries), [queries]);
  return useQueryMonoid(queryProduct, resultMonoid, input as any);
}

/**
 * React hook to `observe` a record of observable queries using the default aggregation strategy for subsequent `QueryResult` payloads
 * @param query The record of queries to observe
 * @param input Input for the observed queries
 */
export function useQueries<R extends VoidInputObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  input?: ProductA<R>
): QueryResult<ProductL<R>, ProductP<R>>;
export function useQueries<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  input: ProductA<R>
): QueryResult<ProductL<R>, ProductP<R>>;
export function useQueries<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  input?: ProductA<R>
): QueryResult<ProductL<R>, ProductP<R>> {
  const queryProduct = useMemo(() => product(queries), [queries]);
  return useQuery(queryProduct, input as any);
}
