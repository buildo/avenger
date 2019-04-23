import * as React from 'react';
import { QueryResult } from '../QueryResult';
import { Omit } from '../util';
import { ObservableQuery } from '../Query';
import { useQuery } from './useQuery';

type QueryInputProps<A> = A extends void ? {} : { query: A };

type QueryOutputProps<L, P> = { query: QueryResult<L, P> };

type InputProps<Props, A> = Omit<Props, 'query'> & QueryInputProps<A>;

interface DeclareQueryReturn<A, L, P> {
  <Props extends QueryOutputProps<L, P>>(
    component: React.ComponentType<Props>
  ): React.ComponentType<InputProps<Props, A>>;
  inputProps: QueryInputProps<A>;
  outputProps: QueryOutputProps<L, P>;
}

export function declareQuery<A, L, P>(
  query: ObservableQuery<A, L, P>
): DeclareQueryReturn<A, L, P> {
  return ((Component: any) => (inputProps: any) => {
    const { query: input, ...props } = inputProps;
    const queryResult = useQuery(query, input);
    return <Component {...props} query={queryResult} />;
  }) as any;
}
