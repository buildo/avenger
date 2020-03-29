import * as QR from '../QueryResult';

export function defaultMonoidResult<L, P>() {
  return {
    empty: QR.queryResultLoading,
    concat: (a: QR.QueryResult<L, P>, b: QR.QueryResult<L, P>) =>
      a._tag === 'Success' && b._tag === 'Loading'
        ? QR.queryResultSuccess<L, P>(a.success, true)
        : b
  };
}
