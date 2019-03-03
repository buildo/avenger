import { array } from 'fp-ts/lib/Array';
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
      return combineLatest(
        query.queries.map((query, i) => observe(query, (input as any)[i])) // TODO
      ).pipe(
        map(array.sequence(queryResult)),
        rxSkipDuplicateLoadings
      );
    case 'cached':
      return query.cache.observe(input).pipe(
        map(cacheValueToQueryResult),
        rxSkipDuplicateLoadings
      );
  }
}
