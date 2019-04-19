import { QueryResult } from '../QueryResult';
import { ReactNode } from 'react';
import { ObservableQuery } from '../Query';
import { useQuery } from './useQuery';

type InputProps<A> = A extends void
  ? {}
  : {
      input: A;
    };

type Props<A, L, P, R extends ReactNode> = {
  query: ObservableQuery<A, L, P>;
  render: (queryResult: QueryResult<L, P>) => R;
} & InputProps<A>;

export function WithQuery<A, L, P, R>(props: Props<A, L, P, R>) {
  return props.render(useQuery(props.query, (props as any).input));
}