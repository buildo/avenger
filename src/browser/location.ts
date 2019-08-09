import { createBrowserHistory } from 'history';
import { invalidate } from '../invalidate';
import { query, map } from '../Query';
import { taskEither, TaskEither } from 'fp-ts/lib/TaskEither';
import { refetch, setoidStrict, setoidJSON } from '../Strategy';
import { getSetoid } from '../CacheValue';
import { getStructSetoid, setoidString } from 'fp-ts/lib/Setoid';
import { command, contramap } from '../command';
import { Task } from 'fp-ts/lib/Task';
import { right } from 'fp-ts/lib/Either';
import { parse, stringify } from 'qs';
import { fromNullable, chain, getEq } from 'fp-ts/lib/Option';
import { flow } from 'fp-ts/lib/function';
import { eqString } from 'fp-ts/lib/Eq';

export type HistoryLocation = {
  pathname: string;
  search: { [k: string]: string | undefined };
};

let _setListener = false;
const history = createBrowserHistory();

const pathRegexp = new RegExp('^[ /]*(.*?)[ /]*$');
const searchRegexp = new RegExp('^[ ?]*(.*?)[ ?]*$');
const sanitizePath = flow(
  pathRegexp.exec.bind(pathRegexp),
  fromNullable,
  chain(ra => fromNullable(ra[1]))
);

const sanitizeSearch = flow(
  searchRegexp.exec.bind(searchRegexp),
  fromNullable,
  chain(ra => fromNullable(ra[1]))
);

/**
 * A query that never fails and returns the current `HistoryLocation`
 */
export const location = query(
  (): TaskEither<void, HistoryLocation> => {
    if (!_setListener) {
      setListener();
    }
    const search: HistoryLocation['search'] = parse(
      sanitizeSearch(history.location.search).getOrElse(history.location.search)
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

const S = getEq(eqString);

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

            const sanitizedPathname = sanitizePath(pathname);
            const sanitizedSearchQuery = sanitizeSearch(searchQuery);

            if (
              !S.equals(
                sanitizedPathname,
                sanitizePath(history.location.pathname)
              ) ||
              !S.equals(
                sanitizedSearchQuery,
                sanitizeSearch(history.location.search)
              )
            ) {
              history.push(
                `${sanitizedPathname.fold(
                  `/${pathname}`,
                  r => `/${r}`
                )}${sanitizedSearchQuery.fold(`?${searchQuery}`, s => `?${s}`)}`
              );
            }
            resolve(right<void, void>(undefined));
          })
      )
    )
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
