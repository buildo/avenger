import { ObservableQuery, queryStrict } from './Query';
import * as TE from 'fp-ts/lib/TaskEither';
import { IORef } from 'fp-ts/lib/IORef';
import { refetch } from './Strategy';
import { command as _command } from './command';
import * as IO from 'fp-ts/lib/IO';
import * as E from 'fp-ts/lib/Either';

/**
 * An helper to create a memory value/ref that can be operated upon using the query/command interface
 *
 * @param initialValue Initial value to store in memory
 */
export function memoryValue<T>(
  initialValue: T
): {
  /**
   * `ObservableQuery` to read the currently stored value
   */
  query: ObservableQuery<void, void, T>;
  /**
   * command to request an update to the stored value
   */
  command: (a: T) => TE.TaskEither<void, void>;
  get: IO.IO<T>;
  set: (value: T) => IO.IO<void>;
} {
  const ref = new IORef(initialValue);
  const fetch = () => TE.fromIOEither<void, T>(IO.io.map(ref.read, E.right));
  const query = queryStrict(fetch, refetch);
  const command = _command(
    (value: T) =>
      TE.fromIOEither<void, void>(IO.io.map(ref.write(value), E.right)),
    {
      query
    }
  );
  return {
    query,
    command,
    get: ref.read,
    set: ref.write
  };
}
