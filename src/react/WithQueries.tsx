import * as React from 'react';
import { declareQueries } from './declareQueries';
import { QueryResult } from '../QueryResult';
import {
  EnforceNonEmptyRecord,
  ObservableQueries,
  ProductL,
  ProductP,
  ProductA
} from '../util';

type QueryOutputProps<L, P> = { queries: QueryResult<L, P> };

type Params<A> = A extends void
  ? {}
  : {
      params: A;
    };

type Props<R extends ObservableQueries> = {
  queries: EnforceNonEmptyRecord<R>;
  render: React.ComponentType<QueryOutputProps<ProductL<R>, ProductP<R>>>;
} & Params<ProductA<R>>;

export function WithQueries<P extends ObservableQueries>(props: Props<P>) {
  const WrappedComponent = React.useMemo(
    () => declareQueries(props.queries)(props.render),
    [false]
  );

  const params = (props as any).params
    ? ({ queries: (props as any).params } as any)
    : {};

  return <WrappedComponent {...params} />;
}

export default WithQueries;
