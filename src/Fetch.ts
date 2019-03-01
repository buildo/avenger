import { TaskEither } from 'fp-ts/lib/TaskEither';

export interface Fetch<A = undefined, L = unknown, P = unknown> {
  (params: A): TaskEither<L, P>;
}
