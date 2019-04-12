import { CacheValue } from './CacheValue';
import {
  QueryResult,
  loading,
  failure,
  success,
  queryResult,
  getSetoid
} from './QueryResult';
import { Observable } from 'rxjs/internal/Observable';
import { observable } from './Observable';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { ObservableQuery } from './Query';
import { sequence, mapWithKey } from 'fp-ts/lib/Record';
import { Setoid } from 'fp-ts/lib/Setoid';
import { setoidStrict, setoidShallow, setoidJSON, JSON } from './Strategy';

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

const sequenceRecordObservable = sequence(observable);
const sequenceRecordQueryResult = sequence(queryResult);

function _observe<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A
): Observable<QueryResult<L, P>> {
  switch (query.type) {
    case 'composition':
      return observable.chain(_observe(query.master, input), master =>
        master.fold(
          observable.of(loading),
          error => observable.of(failure(error, false)),
          value => _observe(query.slave, value)
        )
      );
    case 'product':
      return sequenceRecordObservable(
        mapWithKey(query.queries, (k, query) =>
          _observe(query, (input as any)[k])
        )
      ).pipe(map(sequenceRecordQueryResult)) as any;
    case 'cached':
      return query.cache.observe(input).pipe(map(cacheValueToQueryResult));
  }
}

export function observe<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A,
  resultSetoid: Setoid<QueryResult<L, P>>
): Observable<QueryResult<L, P>> {
  return _observe(query, input).pipe(distinctUntilChanged(resultSetoid.equals));
}

export function observeStrict<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A
): Observable<QueryResult<L, P>> {
  return _observe(query, input).pipe(
    distinctUntilChanged(getSetoid<L, P>(setoidStrict, setoidStrict).equals)
  );
}

export function observeShallow<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A
): Observable<QueryResult<L, P>> {
  return _observe(query, input).pipe(
    distinctUntilChanged(getSetoid<L, P>(setoidShallow, setoidShallow).equals)
  );
}

export function observeJSON<A, L extends JSON, P extends JSON>(
  query: ObservableQuery<A, L, P>,
  input: A
): Observable<QueryResult<L, P>> {
  return _observe(query, input).pipe(
    distinctUntilChanged(getSetoid<L, P>(setoidJSON, setoidJSON).equals)
  );
}
