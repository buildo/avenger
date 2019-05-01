import { taskEither } from 'fp-ts/lib/TaskEither';
import { observe } from '../src/observe';
import {
  queryStrict,
  queryShallow,
  queryJSON,
  query,
  compose,
  product
} from '../src/Query';
import {
  available,
  JSON,
  setoidStrict,
  setoidJSON,
  setoidShallow,
  refetch
} from '../src/Strategy';
import { take, toArray } from 'rxjs/operators';
import { getSetoid } from '../src/QueryResult';
import { getSetoid as getCacheValueSetoid } from '../src/CacheValue';
import { setoidString, setoidNumber } from 'fp-ts/lib/Setoid';

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

describe('invalidate', () => {
  it('composition(a, b)', async () => {
    const fa = jest.fn(() => taskEither.of('foo'));
    const fb = jest.fn((s: string) => taskEither.of(s.length));
    const a = query(fa)(
      refetch(
        setoidStrict as any,
        getCacheValueSetoid(setoidStrict, setoidString)
      )
    );
    const b = query(fb)(
      refetch(setoidString, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const c = compose(
      a,
      b
    );
    await c.invalidate().run();
    expect(fa.mock.calls.length).toBe(1);
    expect(fb.mock.calls.length).toBe(1);
    await c.invalidate().run();
    expect(fa.mock.calls.length).toBe(2);
    expect(fb.mock.calls.length).toBe(2);
  });

  it('{ a, product({ a, b }) }', async () => {
    const fa = jest.fn(() => taskEither.of('foo'));
    const fb = jest.fn(() => taskEither.of(1));
    const a = query(fa)(
      refetch(
        setoidStrict as any,
        getCacheValueSetoid(setoidStrict, setoidString)
      )
    );
    const b = query(fb)(
      refetch(
        setoidStrict as any,
        getCacheValueSetoid(setoidStrict, setoidNumber)
      )
    );
    const ab = product({ a, b });
    await Promise.all([a.invalidate().run(), ab.invalidate().run()]);
    expect(fa.mock.calls.length).toBe(1);
    expect(fb.mock.calls.length).toBe(1);
    await Promise.all([a.invalidate().run(), ab.invalidate().run()]);
    expect(fa.mock.calls.length).toBe(2);
    expect(fb.mock.calls.length).toBe(2);
    await Promise.all([ab.invalidate().run(), a.invalidate().run()]);
    expect(fa.mock.calls.length).toBe(3);
    expect(fb.mock.calls.length).toBe(3);
    await Promise.all([ab.invalidate().run(), a.invalidate().run()]);
    expect(fa.mock.calls.length).toBe(4);
    expect(fb.mock.calls.length).toBe(4);
  });
});
