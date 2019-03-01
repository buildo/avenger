import { taskEither } from 'fp-ts/lib/TaskEither';
import { observe, cache, ObservableFetch } from '../src/observe';
import { take, toArray } from 'rxjs/operators';
import { FetchResult } from '../src/FetchResult';

function collectNEvents<A, L, P>(
  cf: ObservableFetch<A, L, P>,
  input: A,
  n: number
): Promise<Array<FetchResult<L, P>>> {
  requestAnimationFrame(() => cf(input).run());
  return observe(cf, input)
    .pipe(
      take(n),
      toArray()
    )
    .toPromise();
}

describe('observe', () => {
  it('?', async () => {
    const a = (input: number) => taskEither.of(input);
    const cachedA = cache(a);
    const results = await collectNEvents(cachedA, 1, 2);
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 1, loading: false }
    ]);
  });
});
