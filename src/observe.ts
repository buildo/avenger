import { CacheValue } from './CacheValue';
import * as QR from './QueryResult';
import { Observable } from 'rxjs/internal/Observable';
import { observable } from './Observable';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { ObservableQuery } from './Query';
import * as R from 'fp-ts/lib/Record';
import * as Eq from 'fp-ts/lib/Eq';
import * as S from './Strategy';
import * as CV from './CacheValue';
import { pipe } from 'fp-ts/lib/pipeable';

export function cacheValueToQueryResult<L, P>(
  cacheValue: CacheValue<L, P>
): QR.QueryResult<L, P> {
  return pipe(
    cacheValue,
    CV.fold(
      () => QR.queryResultLoading,
      () => QR.queryResultLoading,
      value => QR.queryResultFailure<L, P>(value, false),
      value => QR.queryResultSuccess<L, P>(value, false)
    )
  );
}

const sequenceRecordObservable = R.sequence(observable);
const sequenceRecordQueryResult = R.sequence(QR.queryResult);

function _observe<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A
): Observable<QR.QueryResult<L, P>> {
  switch (query.type) {
    case 'composition':
      const masterObservable = _observe(query.master, input);
      return observable.chain(
        masterObservable,
        QR.fold(
          () => observable.of(QR.queryResultLoading),
          error => observable.of(QR.queryResultFailure(error, false)),
          value => _observe(query.slave, value)
        )
      );
    case 'product':
      return pipe(
        query.queries,
        R.mapWithIndex((k, query) =>
          _observe(query, ((input || {}) as any)[k])
        ),
        sequenceRecordObservable
      ).pipe(map(sequenceRecordQueryResult)) as any;
    case 'cached':
      return query.cache.observe(input).pipe(map(cacheValueToQueryResult));
  }
}

/**
 * Given an `ObservableQuery`, returns an observable stream of `QueryResult`s
 * representing the latest available value for such query
 *
 * @param query The `ObservableQuery` to `observe`
 * @param input Input for `query`
 * @param resultEq The `Eq` used to aggregate subsequent `QueryResult` payloads
 */
export function observe<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A,
  resultEq: Eq.Eq<QR.QueryResult<L, P>>
): Observable<QR.QueryResult<L, P>> {
  return _observe(query, input).pipe(distinctUntilChanged(resultEq.equals));
}

/**
 * Given an `ObservableQuery`, returns an observable stream of `QueryResult`s
 * representing the latest available value for such query,
 * using strict equality to compare and potentially aggregate subsequent results
 *
 * @param query The `ObservableQuery` to `observe`
 * @param input Input for `query`
 */
export function observeStrict<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A
): Observable<QR.QueryResult<L, P>> {
  return _observe(query, input).pipe(
    distinctUntilChanged(QR.getEq<L, P>(Eq.eqStrict, Eq.eqStrict).equals)
  );
}

/**
 * Given an `ObservableQuery`, returns an observable stream of `QueryResult`s
 * representing the latest available value for such query,
 * using shallow equality to compare and potentially aggregate subsequent results
 *
 * @param query The `ObservableQuery` to `observe`
 * @param input Input for `query`
 */
export function observeShallow<A, L, P>(
  query: ObservableQuery<A, L, P>,
  input: A
): Observable<QR.QueryResult<L, P>> {
  return _observe(query, input).pipe(
    distinctUntilChanged(QR.getEq<L, P>(S.eqShallow, S.eqShallow).equals)
  );
}
