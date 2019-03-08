import { CacheValue } from './CacheValue';
import {
  QueryResult,
  loading,
  failure,
  success,
  queryResult
} from './QueryResult';
import { Observable } from 'rxjs/internal/Observable';
import { observable } from './Observable';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { ObservableQuery } from './Query';
import { sequence, mapWithKey } from 'fp-ts/lib/Record';

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

const rxSkipDuplicateLoadings = distinctUntilChanged<QueryResult<any, any>>(
  (fra, frb) => fra.type === 'Loading' && frb.type === 'Loading'
);
const sequenceRecordObservable = sequence(observable);
const sequenceRecordQueryResult = sequence(queryResult);

export function observe<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A
): Observable<QueryResult<L, P>> {
  switch (query.type) {
    case 'composition':
      return observable
        .chain(observe(query.master, input), master =>
          master.fold(
            observable.of(loading),
            error => observable.of(failure(error, false)),
            value => observe(query.slave, value)
          )
        )
        .pipe(rxSkipDuplicateLoadings);
    case 'product':
      return sequenceRecordObservable(
        mapWithKey(query.queries, (k, query) =>
          observe(query, (input as any)[k])
        )
      ).pipe(
        map(sequenceRecordQueryResult),
        rxSkipDuplicateLoadings
      );
    case 'cached':
      return query.cache.observe(input).pipe(
        map(cacheValueToQueryResult),
        rxSkipDuplicateLoadings
      );
  }
}
