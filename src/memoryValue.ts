import { ObservableQuery, queryStrict } from './Query';
import { TaskEither, fromIO } from 'fp-ts/lib/TaskEither';
import { IORef } from 'fp-ts/lib/IORef';
import { refetch } from './Strategy';
import { command as _command } from './command';
import { IO } from 'fp-ts/lib/IO';

export function memoryValue<T>(
  initialValue: T
): {
  query: ObservableQuery<void, void, T>;
  command: (a: T) => TaskEither<void, void>;
  get: IO<T>;
  set: (value: T) => IO<void>;
} {
  const ref = new IORef(initialValue);
  const fetch = () => fromIO<void, T>(ref.read);
  const query = queryStrict(fetch, refetch);
  const command = _command((value: T) => fromIO<void, void>(ref.write(value)), {
    query
  });
  return {
    query,
    command,
    get: ref.read,
    set: ref.write
  };
}
