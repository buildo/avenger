import { useEffect, useState } from 'react';
import { ObservableQuery } from '../Query';
import { QueryResult, loading } from '../QueryResult';
import { observeShallow /*, read*/ } from '../observe';

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
  const [state, setState] = useState<QueryResult<L, P>>(loading);

  useEffect(() => {
    const subscription = observeShallow(query, input).subscribe(setState);
    return subscription.unsubscribe;
  }, [input, query, setState]);

  return state;
}
