import { queryStrict } from './Query';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { refetch } from './Strategy';

export function param<A>() {
  return queryStrict((a: A) => taskEither.of<void, A>(a), refetch);
}

export { queryShallow, queryStrict } from './Query';

export { available, refetch, expire } from './Strategy';

export { compose, product } from './Query';

import { observeShallow } from './observe';

export const observe = observeShallow;

export { invalidate } from './invalidate';
export { command } from './command';
