import * as React from 'react';
import { Monoid } from 'fp-ts/lib/Monoid';
import { Option, fromNullable } from 'fp-ts/lib/Option';
import { QueryResult } from '../QueryResult';
import { product, ObservableQuery } from '../Query';
import {
  EnforceNonEmptyRecord,
  ObservableQueries,
  ProductL,
  ProductP,
  ProductA,
  VoidInputObservableQueries
} from '../util';
import { defaultMonoidResult } from './util';
import { observable } from '../Observable';
import { observeShallow } from '../observe';
import { setoidShallow } from '../Strategy';

function usePrevious<T>(value: T): Option<T> {
  const ref = React.useRef<T>();
  React.useEffect(() => {
    ref.current = value;
  });
  return fromNullable(ref.current);
}

/**
 * A React hook to observe an `ObservableQuery`
 *
 * @param query an `ObservableQueries`
 * @param params input values for the query
 * @param resultMonoid an optional monoid used to aggregate `QueryResult`s
 * @returns the latest `QueryResult` to operate upon
 *
 * @example
 * useQuery(randomQuery, randomQueryParams).fold(
 *   () => "load",
 *   () => "failed",
 *   (randomQueryResult) => randomQueryResult
 * )
 */
export function useQuery<A extends void, L, P>(
  query: ObservableQuery<A, L, P>,
  params?: A,
  resultMonoid?: Monoid<QueryResult<L, P>>
): QueryResult<L, P>;
export function useQuery<A, L, P>(
  query: ObservableQuery<A, L, P>,
  params: A,
  resultMonoid?: Monoid<QueryResult<L, P>>
): QueryResult<L, P>;
export function useQuery<A, L, P>(
  query: ObservableQuery<A, L, P>,
  params: A,
  resultMonoid?: Monoid<QueryResult<L, P>>
): QueryResult<L, P> {
  const _resultMonoid = resultMonoid || defaultMonoidResult<L, P>();

  const [state, setState] = React.useState<QueryResult<L, P>>(
    _resultMonoid.empty
  );

  const previousInput = usePrevious(params);
  const [inputEquality, setInputEquality] = React.useState(0);

  React.useEffect(() => {
    const inputChanged = previousInput.fold(
      false,
      previousInput => !query.inputSetoid.equals(previousInput, params)
    );
    if (inputChanged) {
      setInputEquality(inputEquality + 1);
    }
  });

  React.useEffect(() => {
    const subscription = observable
      .map(observeShallow(query, params), r => _resultMonoid.concat(state, r))
      .subscribe(setState);
    return () => {
      subscription.unsubscribe();
    };
  }, [inputEquality, query, setState]);

  return state;
}

/**
 * A React hook to observe a record of `ObservableQueries`
 *
 * @param queries a record of `ObservableQueries`
 * @param params a record of inputs for the queries
 * @param resultMonoid an optional monoid used to aggregate `QueryResult`s
 * @returns the latest `QueryResult` to operate upon
 *
 * @example
 * useQueries(
 *   { randomQuery },
 *   { randomQuery: randomQueryParams }
 * ).fold(
 *   () => "load",
 *   () => "failed",
 *   ({ randomQuery: randomQueryResult }) => randomQueryResult
 * )
 */
export function useQueries<R extends VoidInputObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  input?: ProductA<R>,
  resultMonoid?: Monoid<QueryResult<ProductL<R>, ProductP<R>>>
): QueryResult<ProductL<R>, ProductP<R>>;
export function useQueries<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  input: ProductA<R>,
  resultMonoid?: Monoid<QueryResult<ProductL<R>, ProductP<R>>>
): QueryResult<ProductL<R>, ProductP<R>>;
export function useQueries<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  params?: ProductA<R>,
  resultMonoid?: Monoid<QueryResult<ProductL<R>, ProductP<R>>>
): QueryResult<ProductL<R>, ProductP<R>> {
  const previousQueries = usePrevious(queries);
  const [queriesEquality, setQueriesEquality] = React.useState(0);
  const queryProduct = React.useMemo(() => product(queries), [queriesEquality]);
  React.useEffect(() => {
    const queriesChanged = previousQueries.fold(
      false,
      previousQueries => !setoidShallow.equals(previousQueries, queries)
    );
    if (queriesChanged) {
      setQueriesEquality(queriesEquality + 1);
    }
  });

  return useQuery(queryProduct, (params || {}) as any, resultMonoid);
}

export default useQueries;
