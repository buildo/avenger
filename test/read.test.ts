import { queryStrict, compose, product, queryShallow } from '../src/Query';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { available } from '../src/Strategy';
import { read } from '../src/observe';

describe('read', () => {
  it('should return a Loading result for a query that has never been fetched', () => {
    const a1 = queryStrict(
      (s: string) => taskEither.of<string, number>(s.length),
      available
    );
    const a2 = queryStrict(
      (n: number) => taskEither.of<string, number>(n * 2),
      available
    );
    const b = queryShallow(
      (input: { a1: number; a2: number }) =>
        taskEither.of<string, boolean>(input.a1 > input.a2),
      available
    );
    const a12 = product({ a1, a2 });
    const a12b = compose(
      a12,
      b
    );
    expect(read(a12b, { a1: 'foo', a2: 4 })).toEqual({ type: 'Loading' });
  });

  it('should return a Loading result for a query that is pending', () => {
    const a1 = queryStrict(
      (s: string) => taskEither.of<string, number>(s.length),
      available
    );
    const a2 = queryStrict(
      (n: number) => taskEither.of<string, number>(n * 2),
      available
    );
    const b = queryShallow(
      (input: { a1: number; a2: number }) =>
        taskEither.of<string, boolean>(input.a1 > input.a2),
      available
    );
    const a12 = product({ a1, a2 });
    const a12b = compose(
      a12,
      b
    );

    expect(read(a12b, { a1: 'foo', a2: 4 })).toEqual({ type: 'Loading' });
  });

  it('should return a Success result for a query that is resolved and has strategy available', async () => {
    const a1 = queryStrict(
      (s: string) => taskEither.of<string, number>(s.length),
      available
    );
    const a2 = queryStrict(
      (n: number) => taskEither.of<string, number>(n * 2),
      available
    );
    const b = queryShallow(
      (input: { a1: number; a2: number }) =>
        taskEither.of<string, boolean>(input.a1 > input.a2),
      available
    );
    const a12 = product({ a1, a2 });
    const a12b = compose(
      a12,
      b
    );
    await a12b.run({ a1: 'foo', a2: 4 }).run();
    expect(read(a12b, { a1: 'foo', a2: 4 })).toEqual({
      type: 'Success',
      loading: false,
      value: false
    });
  });
});
