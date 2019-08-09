import { createBrowserHistory } from 'history';
import { invalidate } from '../invalidate';
import { query, map } from '../Query';
import { taskEither, TaskEither, fromIO } from 'fp-ts/lib/TaskEither';
import { refetch, setoidStrict, setoidJSON } from '../Strategy';
import { getSetoid } from '../CacheValue';
import { getStructSetoid, setoidString, setoidBoolean } from 'fp-ts/lib/Setoid';
import { command, contramap } from '../command';
import { Task } from 'fp-ts/lib/Task';
import { right } from 'fp-ts/lib/Either';
import { parse, stringify } from 'qs';
import trim = require('lodash.trim');
import { IO } from 'fp-ts/lib/IO';

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
    invalidate({ pendingUpdateLocation });
  }
});

/**
 * A query that never fails and returns the current `HistoryLocation`
 */
export const location = query(
  (): TaskEither<void, HistoryLocation> => {
    if (!_setListener) {
      setListener();
    }
    const search: HistoryLocation['search'] = parse(
      trim(history.location.search, '?')
    );
    return taskEither.of<void, HistoryLocation>({
      pathname: history.location.pathname,
      search
    });
  }
)(
  refetch<void, void, HistoryLocation>(
    setoidStrict as any,
    getSetoid<void, HistoryLocation>(
      setoidStrict as any,
      getStructSetoid<HistoryLocation>({
        pathname: setoidString,
        search: setoidJSON as any
      })
    )
  )
);

function setListener() {
  history.listen(() => {
    invalidate({ location }).run();
  });
  _setListener = true;
}

/**
 * A command that never fails and updates the current `HistoryLocation`
 */
export const doUpdateLocation = command(
  // no need to invalidate `location` since it will be invalidated by the `history` listener anyway
  ({ search, pathname }: HistoryLocation): TaskEither<void, void> =>
    new TaskEither(
      new Task(
        () =>
          new Promise(resolve => {
            const searchQuery =
              Object.keys(search).length > 0
                ? `?${stringify(search, { skipNulls: true })}`
                : '';
            if (
              trim(pathname, ' /') !== trim(history.location.pathname, ' /') ||
              trim(searchQuery, ' ?') !== trim(history.location.search, ' ?')
            ) {
              const url = `/${trim(pathname, ' /')}${searchQuery}`;
              history.push(url);
            }
            resolve(right<void, void>(undefined));
          })
      )
    )
);

/**
 * A query that never fails and returns `true` if there's a pending (blocked) location update
 */
export const pendingUpdateLocation = query(() =>
  taskEither.of<void, boolean>(!!_historyBlockCallback)
)(
  refetch<void, void, boolean>(
    setoidStrict as any,
    getSetoid<void, boolean>(setoidStrict as any, setoidBoolean)
  )
);

/**
 * A command that never fails and resolves (blocks or unblocks) the pending location update, if any
 */
export const doResolvePendingUpdateLocation = command(
  (confirm: boolean) =>
    fromIO<void, void>(
      new IO(() => {
        const callback = _historyBlockCallback;
        _historyBlockCallback = null;
        if (callback) {
          callback(confirm);
        }
      })
    ),
  { location, pendingUpdateLocation }
);

/**
 * Returns an `ObservableQuery` for the current `HistoryLocation` mapped to a custom type `CurrentView`
 * @param f Function to transform the current `HistoryLocation`
 */
export function getCurrentView<A>(f: (location: HistoryLocation) => A) {
  return map(location, f);
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
