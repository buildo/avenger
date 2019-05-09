import { useEffect, useState } from 'react';
import { ObservableQuery } from '../Query';
import { QueryResult, loading, success } from '../QueryResult';
import { observeShallow } from '../observe';
import { Monoid } from 'fp-ts/lib/Monoid';
import { observable } from '../Observable';

export function useQueryM<A extends void, L, P>(
  query: ObservableQuery<A, L, P>,
  resultMonoid: Monoid<QueryResult<L, P>>,
  input?: A
): QueryResult<L, P>;
export function useQueryM<A, L, P>(
  query: ObservableQuery<A, L, P>,
  resultMonoid: Monoid<QueryResult<L, P>>,
  input: A
): QueryResult<L, P>;
export function useQueryM<A, L, P>(
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

function defaultMonoidResult<L, P>() {
  return {
    empty: loading,
    concat: (a: QueryResult<L, P>, b: QueryResult<L, P>) =>
      a.type === 'Success' && b.type === 'Loading'
        ? success<L, P>(a.value, true)
        : b
  };
}

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
  return useQueryM(query, defaultMonoidResult<L, P>(), input);
}
