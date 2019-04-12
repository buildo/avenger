import { taskEither } from 'fp-ts/lib/TaskEither';
import { observe } from '../src/observe';
import { queryStrict, queryShallow, queryJSON } from '../src/Query';
import {
  available,
  JSON,
  setoidStrict,
  setoidJSON,
  setoidShallow
} from '../src/Strategy';
import { take, toArray } from 'rxjs/operators';
import { getSetoid } from '../src/QueryResult';

describe('queryStrict', () => {
  it('caches indefinitely with strategy=available', async () => {
    const a = (input: number) => taskEither.of(input);
    const cachedA = queryStrict(a, available);
    const resultSetoid = getSetoid(setoidStrict, setoidStrict);
    requestAnimationFrame(() => cachedA.run(1).run());
    const results1 = await observe(cachedA, 1, resultSetoid)
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
    const results2 = await observe(cachedA, 1, resultSetoid)
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
    const resultSetoid = getSetoid(setoidShallow, setoidShallow);
    requestAnimationFrame(() => cachedA.run({ foo: 1 }).run());
    const results1 = await observe(cachedA, { foo: 1 }, resultSetoid)
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
    const results2 = await observe(cachedA, { foo: 1 }, resultSetoid)
      .pipe(
        take(1),
        toArray()
      )
      .toPromise();
    expect(results2).toEqual([
      { type: 'Success', value: { foo: 1 }, loading: false }
    ]);
  });

  describe('queryJSON', () => {
    it('caches indefinitely with strategy=available', async () => {
      const a = (input: JSON) => taskEither.of<JSON, JSON>(input);
      const cachedA = queryJSON(a, available);
      const resultSetoid = getSetoid(setoidJSON, setoidJSON);
      requestAnimationFrame(() => cachedA.run({ foo: { bar: 1 } }).run());
      const results1 = await observe(cachedA, { foo: { bar: 1 } }, resultSetoid)
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
      const results2 = await observe(cachedA, { foo: { bar: 1 } }, resultSetoid)
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
