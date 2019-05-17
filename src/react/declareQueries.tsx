import * as React from 'react';
import { QueryResult } from '../QueryResult';
import {
  Omit,
  ObservableQueries,
  EnforceNonEmptyRecord,
  ProductA,
  ProductL,
  ProductP
} from '../util';
import { product } from '../Query';
import { useQuery, useQueryMonoid } from './useQuery';
import { Monoid } from 'fp-ts/lib/Monoid';

type QueryInputProps<A> = A extends void ? {} : { queries: A };

type QueryOutputProps<L, P> = { queries: QueryResult<L, P> };

type InputProps<Props, A> = Omit<Props, 'queries'> & QueryInputProps<A>;

interface DeclareQueriesReturn<A, L, P> {
  <Props extends QueryOutputProps<L, P>>(
    component: React.ComponentType<Props>
  ): React.ComponentType<InputProps<Props, A>>;
  InputProps: QueryInputProps<A>;
  Props: QueryOutputProps<L, P>;
}

export function declareQueries<R extends ObservableQueries>(
  queries: EnforceNonEmptyRecord<R>,
  resultMonoid?: Monoid<QueryResult<ProductL<R>, ProductP<R>>>
): DeclareQueriesReturn<ProductA<R>, ProductL<R>, ProductP<R>> {
  return ((Component: any) => (inputProps: any) => {
    const { queries: input, ...props } = inputProps;
    const queryResult = resultMonoid
      ? useQueryMonoid(product(queries), resultMonoid, input)
      : useQuery(product(queries), input);
    return <Component {...props} queries={queryResult} />;
  }) as any;
}
