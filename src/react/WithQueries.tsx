import * as React from 'react';
import { Semigroup } from 'fp-ts/lib/Semigroup';
import { declareQueries } from './declareQueries';
import { QueryResult } from '../QueryResult';
import {
  EnforceNonEmptyRecord,
  ObservableQueries,
  ProductL,
  ProductP,
  ProductA
} from '../util';
import { keepQueryResultSemigroup } from './Semigroup';

type Params<A> = A extends void
  ? {}
  : {
      params: A;
    };

type Props<R extends ObservableQueries> = {
  queries: EnforceNonEmptyRecord<R>;
  render: (result: QueryResult<ProductL<R>, ProductP<R>>) => React.ReactNode;
  resultSemigroup?: Semigroup<QueryResult<ProductL<R>, ProductP<R>>>;
} & Params<ProductA<R>>;

/**
 * A React component to observe a record of `ObservableQueries`
 *
 * @param queries a record of `ObservableQueries`
 * @param params a record of inputs for the queries
 * @param render a function that accepts a product of QueryResult and returns a ReactNode
 * @param resultSemigroup an optional semigroup used to aggregate `QueryResult`s
 *
 * @example
 * return (
 *   <WithQueries
 *    queries={{ randomQuery }}
 *    params={{ randomQuery: randomQueryParams }}
 *    render={queries => queries.fold(
 *      () => "load",
 *      () => "failed",
 *      ({ randomQuery: randomQueryResult }) => randomQueryResult
 *    }
 *  />
 * )
 */
export function WithQueries<P extends ObservableQueries>(props: Props<P>) {
  const renderRef = React.useRef(props.render);

  React.useEffect(() => {
    renderRef.current = props.render;
  }, [props.render]);

  const WrappedComponent = React.useMemo(
    () =>
      declareQueries(
        props.queries,
        props.resultSemigroup ||
          keepQueryResultSemigroup<ProductL<P>, ProductP<P>>()
      )(({ queries }) => <>{renderRef.current(queries)}</>),
    []
  );

  const params = (props as any).params
    ? ({ queries: (props as any).params } as any)
    : {};

  return <WrappedComponent {...params} />;
}
