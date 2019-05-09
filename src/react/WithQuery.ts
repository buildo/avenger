import { QueryResult } from '../QueryResult';
import { ReactNode } from 'react';
import { ObservableQuery } from '../Query';
import { useQuery, useQueryMonoid } from './useQuery';
import { Monoid } from 'fp-ts/lib/Monoid';

type InputProps<A> = A extends void
  ? {}
  : {
      input: A;
    };

type Props<A, L, P, R extends ReactNode> = {
  query: ObservableQuery<A, L, P>;
  resultMonoid?: Monoid<QueryResult<L, P>>;
  render: (queryResult: QueryResult<L, P>) => R;
} & InputProps<A>;

export function WithQuery<A, L, P, R>(props: Props<A, L, P, R>) {
  const queryResult = props.resultMonoid
    ? useQueryMonoid(props.query, props.resultMonoid, (props as any).input)
    : useQuery(props.query, (props as any).input);
  return props.render(queryResult);
}
