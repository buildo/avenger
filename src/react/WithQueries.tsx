import * as React from 'react';
import { Function1 } from 'fp-ts/lib/function';
import { declareQueries } from './declareQueries';
import { QueryResult } from '../QueryResult';
import {
  EnforceNonEmptyRecord,
  ObservableQueries,
  ProductL,
  ProductP,
  ProductA
} from '../util';

type Params<A> = A extends void
  ? {}
  : {
      params: A;
    };

type Props<R extends ObservableQueries> = {
  queries: EnforceNonEmptyRecord<R>;
  render: Function1<QueryResult<ProductL<R>, ProductP<R>>, React.ReactNode>;
} & Params<ProductA<R>>;

/**
 * A React component to observe a record of `ObservableQueries`
 *
 * @param queries a record of `ObservableQueries`
 * @param params a record of inputs for the queries
 * @param render a function that accepts a product of QueryResult and returns a ReactNode
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
  const WrappedComponent = React.useMemo(
    () =>
      declareQueries(props.queries)(({ queries }) => (
        <>{props.render(queries)}</>
      )),
    []
  );

  const params = (props as any).params
    ? ({ queries: (props as any).params } as any)
    : {};

  return <WrappedComponent {...params} />;
}

export default WithQueries;
