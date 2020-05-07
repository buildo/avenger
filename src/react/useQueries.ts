import { Semigroup } from 'fp-ts/lib/Semigroup';
import { Option, fromNullable } from 'fp-ts/lib/Option';
import { QueryResult, loading } from '../QueryResult';
import { product, ObservableQuery } from '../Query';
import {
  EnforceNonEmptyRecord,
  ObservableQueries,
  ProductL,
  ProductP,
  ProductA,
  VoidInputObservableQueries
} from '../util';
import { keepQueryResultSemigroup } from './Semigroup';
import { observable } from '../Observable';
import { observeShallow } from '../observe';
import { setoidShallow } from '../Strategy';
import { useRef, useEffect, useState, useMemo } from 'react';

function usePrevious<T>(value: T): Option<T> {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return fromNullable(ref.current);
}

/**
 * A React hook to observe an `ObservableQuery`
 *
 * @param query an `ObservableQueries`
 * @param params input values for the query
 * @param resultSemigroup an optional semigroup used to aggregate `QueryResult`s
 * @returns the latest `QueryResult` to operate upon
 *
 * @example
 * useQuery(randomQuery, randomQueryParams).fold(
 *   () => "load",
 *   () => "failed",
 *   (randomQueryResult) => randomQueryResult
 * )
 */
export function useQuery<L, P>(
  query: ObservableQuery<void, L, P>,
  params?: void,
  resultSemigroup?: Semigroup<QueryResult<L, P>>
): QueryResult<L, P>;
export function useQuery<A, L, P>(
  query: ObservableQuery<A, L, P>,
  params: A,
  resultSemigroup?: Semigroup<QueryResult<L, P>>
): QueryResult<L, P>;
export function useQuery<A, L, P>(
  query: ObservableQuery<A, L, P>,
  params: A,
  resultSemigroup?: Semigroup<QueryResult<L, P>>
): QueryResult<L, P> {
  const _resultSemigroup = resultSemigroup || keepQueryResultSemigroup<L, P>();

  const [state, setState] = useState<QueryResult<L, P>>(loading);

  const previousInput = usePrevious(params);
  const [inputEquality, setInputEquality] = useState(0);

  useEffect(() => {
    const inputChanged = previousInput.fold(
      false,
      previousInput => !query.inputSetoid.equals(previousInput, params)
    );
    if (inputChanged) {
      setInputEquality(inputEquality + 1);
    }
  });

  const lastState = useRef(state);
  useEffect(() => {
    lastState.current = state;
  }, [state]);

  const lastParams = useMemo(() => params, [inputEquality]);

  useEffect(() => {
    const subscription = observable
      .map(observeShallow(query, lastParams), r =>
        _resultSemigroup.concat(lastState.current, r)
      )
      .subscribe(setState);
    return () => {
      subscription.unsubscribe();
    };
  }, [query, lastParams]);

  return state;
}

/**
 * A React hook to observe a record of `ObservableQueries`
 *
 * @param queries a record of `ObservableQueries`
 * @param params a record of inputs for the queries
 * @param resultSemigroup an optional monoid used to aggregate `QueryResult`s
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
  resultSemigroup?: Semigroup<QueryResult<ProductL<R>, ProductP<R>>>
): QueryResult<ProductL<R>, ProductP<R>>;
export function useQueries<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  input: ProductA<R>,
  resultSemigroup?: Semigroup<QueryResult<ProductL<R>, ProductP<R>>>
): QueryResult<ProductL<R>, ProductP<R>>;
export function useQueries<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  params?: ProductA<R>,
  resultSemigroup?: Semigroup<QueryResult<ProductL<R>, ProductP<R>>>
): QueryResult<ProductL<R>, ProductP<R>> {
  const previousQueries = usePrevious(queries);
  const [queriesEquality, setQueriesEquality] = useState(0);
  const queryProduct = useMemo(() => product(queries), [queriesEquality]);
  useEffect(() => {
    const queriesChanged = previousQueries.fold(
      false,
      previousQueries => !setoidShallow.equals(previousQueries, queries)
    );
    if (queriesChanged) {
      setQueriesEquality(queriesEquality + 1);
    }
  });

  return useQuery(queryProduct, (params || {}) as any, resultSemigroup);
}

export default useQueries;
