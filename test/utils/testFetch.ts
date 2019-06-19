import { TaskEither } from 'fp-ts/lib/TaskEither';
import { fromNullable } from 'fp-ts/lib/Option';
import { ObservableQuery } from '../../src/Query';
import { QueryResult } from '../../src/QueryResult';
import { observeShallow } from '../../src/observe';
import {
  toArray,
  take,
  timeout,
  switchMap,
  delay,
  bufferCount
} from 'rxjs/operators';
import { identity } from 'fp-ts/lib/function';
import { throwError, race } from 'rxjs';

type TestFetch<A, L, P> = (input: A) => TaskEither<L, P>;

export function makeTestFetch<A = void, L = unknown, P = unknown>(
  results: Array<TestFetch<A, L, P>>
): jest.Mock<TaskEither<L, P>, [A]> & { assertExhausted: () => void } {
  let index = 0;
  const fn = jest.fn(input => {
    const te = fromNullable(results[index])
      .map(f => f(input))
      .foldL(() => {
        throw new Error('test fetch out of range');
      }, identity);
    index += 1;
    return te;
  });

  (fn as any).assertExhausted = () =>
    expect(fn.mock.calls.length).toBe(results.length);
  return fn as any;
}

export async function observeNShallow<A extends void, L, P>(
  n: number,
  query: ObservableQuery<A, L, P>,
  input?: void
): Promise<Array<QueryResult<L, P>>>;
export async function observeNShallow<A, L, P>(
  n: number,
  query: ObservableQuery<A, L, P>,
  input: A
): Promise<Array<QueryResult<L, P>>>;
export async function observeNShallow<A, L, P>(
  n: number,
  query: ObservableQuery<A, L, P>,
  input: A
): Promise<Array<QueryResult<L, P>>> {
  const results = observeShallow(query, input);
  const ok = results.pipe(
    timeout(500), // fail faster than the default jest async timeout
    take(n),
    delay(50) // time window used to wait for possible additional results and fail
  );
  const ko = results.pipe(
    bufferCount(n + 1), // fails as soon as an unexpected result is received
    switchMap(() => throwError('too many results'))
  );
  return race(ok, ko)
    .pipe(toArray())
    .toPromise();
}
