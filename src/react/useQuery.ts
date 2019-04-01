import { useEffect, useState } from 'react';
import { ObservableQuery } from '../Query';
import { QueryResult, loading } from '../QueryResult';
import { observeShallow } from '../observe';

export function useQuery<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A
): QueryResult<L, P> {
  const [state, setState] = useState<QueryResult<L, P>>(loading);

  useEffect(() => {
    observeShallow(query, input).subscribe(setState);
  }, [input]);

  return state;
}
