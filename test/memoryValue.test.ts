import { memoryValue } from '../src/memoryValue';
import { none, some, Option } from 'fp-ts/lib/Option';
import { observeStrict } from '../src/observe';
import { toArray, take } from 'rxjs/operators';

describe('memoryValue', () => {
  it('should work', async () => {
    const { query, command } = memoryValue<Option<string>>(none);
    requestAnimationFrame(() => command(some('token')).run());
    const results = await observeStrict(query, undefined)
      .pipe(
        take(4),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', loading: false, value: none },
      { type: 'Loading' },
      { type: 'Success', loading: false, value: some('token') }
    ]);
  });
});
