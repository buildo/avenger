import { taskEither } from 'fp-ts/lib/TaskEither';
import { observe } from '../src/observe';
import { queryStrict, queryShallow, queryJSONStringify } from '../src/Query';
import { available } from '../src/Strategy';
import { take, toArray } from 'rxjs/operators';

describe('queryStrict', () => {
  it('caches indefinitely with strategy=available', async () => {
    const a = (input: number) => taskEither.of(input);
    const cachedA = queryStrict(a, available);
    requestAnimationFrame(() => cachedA.run(1).run());
    const results1 = await observe(cachedA, 1)
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results1).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 1, loading: false }
    ]);
    requestAnimationFrame(() => cachedA.run(1).run());
    const results2 = await observe(cachedA, 1)
      .pipe(
        take(1),
        toArray()
      )
      .toPromise();
    expect(results2).toEqual([{ type: 'Success', value: 1, loading: false }]);
  });
});

describe('queryShallow', () => {
  it('caches indefinitely with strategy=available', async () => {
    const a = (input: Record<string, number>) => taskEither.of(input);
    const cachedA = queryShallow(a, available);
    requestAnimationFrame(() => cachedA.run({ foo: 1 }).run());
    const results1 = await observe(cachedA, { foo: 1 })
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results1).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: { foo: 1 }, loading: false }
    ]);
    requestAnimationFrame(() => cachedA.run({ foo: 1 }).run());
    const results2 = await observe(cachedA, { foo: 1 })
      .pipe(
        take(1),
        toArray()
      )
      .toPromise();
    expect(results2).toEqual([
      { type: 'Success', value: { foo: 1 }, loading: false }
    ]);
  });

  describe('queryJSONStringify', () => {
    it('caches indefinitely with strategy=available', async () => {
      const a = (input: Record<string, Record<string, number>>) =>
        taskEither.of(input);
      const cachedA = queryJSONStringify(a, available);
      requestAnimationFrame(() => cachedA.run({ foo: { bar: 1 } }).run());
      const results1 = await observe(cachedA, { foo: { bar: 1 } })
        .pipe(
          take(2),
          toArray()
        )
        .toPromise();
      expect(results1).toEqual([
        { type: 'Loading' },
        { type: 'Success', value: { foo: { bar: 1 } }, loading: false }
      ]);
      requestAnimationFrame(() => cachedA.run({ foo: { bar: 1 } }).run());
      const results2 = await observe(cachedA, { foo: { bar: 1 } })
        .pipe(
          take(1),
          toArray()
        )
        .toPromise();
      expect(results2).toEqual([
        { type: 'Success', value: { foo: { bar: 1 } }, loading: false }
      ]);
    });
  });
});
