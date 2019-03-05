import { CacheValue } from './CacheValue';
import {
  QueryResult,
  loading,
  failure,
  success,
  queryResult
} from './QueryResult';
import { of, Observable, combineLatest } from 'rxjs';
import { distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { ObservableQuery } from './Query';
import { sequence, mapWithKey } from 'fp-ts/lib/Record';
import { tuple } from 'fp-ts/lib/function';

function cacheValueToQueryResult<L, P>(
  cacheValue: CacheValue<L, P>
): QueryResult<L, P> {
  return cacheValue.fold(
    () => loading,
    () => loading,
    value => failure<L, P>(value, false),
    value => success<L, P>(value, false)
  );
}

const rxLoading = of(loading);
const rxSkipDuplicateLoadings = distinctUntilChanged<QueryResult<any, any>>(
  (fra, frb) => fra.type === 'Loading' && frb.type === 'Loading'
);

export function observe<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A
): Observable<QueryResult<L, P>> {
  switch (query.type) {
    case 'composition':
      return observe(query.master, input).pipe(
        switchMap(master =>
          master.fold(
            rxLoading,
            error => of(failure(error, false)),
            value => observe(query.slave, value)
          )
        ),
        rxSkipDuplicateLoadings
      );
    case 'product':
      const observableStruct = mapWithKey(query.queries, (k, query) =>
        // @ts-ignore
        observe(query, input[k]).pipe(map(result => tuple(k, result)))
      );
      const observableTuple = Object.values(observableStruct);
      return combineLatest(observableTuple).pipe(
        map(trs =>
          trs.reduce(
            // @ts-ignore
            (acc, tr) => ({ ...acc, [tr[0]]: tr[1] }),
            {}
          )
        ),
        map(sequence(queryResult)),
        rxSkipDuplicateLoadings
      );
    case 'cached':
      return query.cache.observe(input).pipe(
        map(cacheValueToQueryResult),
        rxSkipDuplicateLoadings
      );
  }
}
