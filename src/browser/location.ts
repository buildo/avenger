import { createBrowserHistory } from 'history';
import { invalidate } from '../invalidate';
import * as Q from '../Query';
import * as TE from 'fp-ts/lib/TaskEither';
import * as S from '../Strategy';
import * as CV from '../CacheValue';
import * as Eq from 'fp-ts/lib/Eq';
import { command, contramap } from '../command';
import * as E from 'fp-ts/lib/Either';
import { parse, stringify } from 'qs';

export type HistoryLocation = {
  pathname: string;
  search: { [k: string]: string | undefined };
};

let _setListener = false;
let _historyBlockCallback: ((confirm: boolean) => void) | null = null;

export const requestConfirmationToUpdateLocation = (): (() => void) =>
  history.block(() => '');

const history = createBrowserHistory({
  getUserConfirmation(_, callback) {
    _historyBlockCallback = callback;
    invalidate({ pendingUpdateLocation })();
  }
});

/**
 * A query that never fails and returns the current `HistoryLocation`
 */
export const location = Q.query(
  (): TE.TaskEither<void, HistoryLocation> => {
    if (!_setListener) {
      setListener();
    }
    const search: HistoryLocation['search'] = parse(history.location.search, {
      ignoreQueryPrefix: true
    });
    return TE.taskEither.of<void, HistoryLocation>({
      pathname: history.location.pathname,
      search
    });
  }
)(
  S.refetch<void, void, HistoryLocation>(
    Eq.eqStrict,
    CV.getEq<void, HistoryLocation>(
      Eq.eqStrict,
      Eq.getStructEq<HistoryLocation>({
        pathname: Eq.eqString,
        search: S.eqShallow
      })
    )
  )
);

function setListener() {
  history.listen(() => {
    invalidate({ location })();
  });
  _setListener = true;
}

/**
 * A command that never fails and updates the current `HistoryLocation`
 */
export const doUpdateLocation = command(
  // no need to invalidate `location` since it will be invalidated by the `history` listener anyway
  ({ search, pathname }: HistoryLocation): TE.TaskEither<void, void> => () =>
    new Promise(resolve => {
      const searchQuery =
        Object.keys(search).length > 0
          ? `?${stringify(search, { skipNulls: true })}`
          : '';
      const sanitizedPathname = `/${pathname.trim().replace(/^[\/]+/, '')}`;
      if (
        sanitizedPathname !== history.location.pathname ||
        searchQuery !== history.location.search
      ) {
        const url = `${sanitizedPathname}${searchQuery}`;
        history.push(url);
      }
      resolve(E.right<void, void>(undefined));
    })
);

/**
 * A query that never fails and returns `true` if there's a pending (blocked) location update
 */
export const pendingUpdateLocation = Q.query(() =>
  TE.taskEither.of<void, boolean>(!!_historyBlockCallback)
)(
  S.refetch<void, void, boolean>(
    Eq.eqStrict,
    CV.getEq<void, boolean>(Eq.eqStrict, Eq.eqBoolean)
  )
);

/**
 * A command that never fails and resolves (blocks or unblocks) the pending location update, if any
 */
export const doResolvePendingUpdateLocation = command(
  (confirm: boolean) =>
    TE.fromIOEither<void, void>(() => {
      const callback = _historyBlockCallback;
      _historyBlockCallback = null;
      if (callback) {
        callback(confirm);
      }
      return E.right(undefined);
    }),
  { location, pendingUpdateLocation }
);

/**
 * Returns an `ObservableQuery` for the current `HistoryLocation` mapped to a custom type `CurrentView`
 * @param f Function to transform the current `HistoryLocation`
 */
export function getCurrentView<A>(f: (location: HistoryLocation) => A) {
  return Q.map(location, f);
}

/**
 * returns a command that updates the current `HistoryLocation` and receives as input a custom type `CurrentView`
 * @param f Function to transform a value to an `HistoryLocation`
 */
export function getDoUpdateCurrentView<A>(
  f: (currentView: A) => HistoryLocation
) {
  return contramap(doUpdateLocation, f);
}
