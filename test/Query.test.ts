import { taskEither } from 'fp-ts/lib/TaskEither';
import { observe } from '../src/observe';
import { queryStrict, queryShallow, queryJSON, map } from '../src/Query';
import {
  available,
  setoidStrict,
  setoidJSON,
  JSON,
  refetch
} from '../src/Strategy';
import { QueryResult, getSetoid } from '../src/QueryResult';
import { delay } from 'fp-ts/lib/Task';
import { right } from 'fp-ts/lib/Either';

describe('queryStrict', () => {
  it('caches indefinitely with strategy=available', async () => {
    let events: QueryResult<unknown, unknown>[] = [];
    const eventsSpy = jest.fn(e => events.push(e));
    const a = (input: number) => taskEither.of(input);
    const cachedA = queryStrict(a, available);
    const observable = observe(cachedA, 1, setoidStrict);
    observable.subscribe(eventsSpy);
    await delay(10, void 0).run();
    observable.subscribe(eventsSpy);
    observable.subscribe(eventsSpy);

    expect(events).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 1, loading: false },
      { type: 'Success', value: 1, loading: false },
      { type: 'Success', value: 1, loading: false }
    ]);
  });
});

describe('queryShallow', () => {
  it('caches indefinitely with strategy=available', async () => {
    let events: QueryResult<unknown, unknown>[] = [];
    const eventsSpy = jest.fn(e => events.push(e));
    const a = (input: number) => taskEither.of(input);
    const cachedA = queryShallow(a, available);
    const observable = observe(cachedA, 1, setoidStrict);
    observable.subscribe(eventsSpy);
    await delay(10, void 0).run();
    observable.subscribe(eventsSpy);
    observable.subscribe(eventsSpy);

    expect(events).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 1, loading: false },
      { type: 'Success', value: 1, loading: false },
      { type: 'Success', value: 1, loading: false }
    ]);
  });
});

describe('queryJSON', () => {
  it('caches indefinitely with strategy=available', async () => {
    let events: QueryResult<unknown, unknown>[] = [];
    const eventsSpy = jest.fn(e => events.push(e));
    const a = (input: JSON) => taskEither.of<JSON, JSON>(input);
    const cachedA = queryJSON(a, available);
    const resultSetoid = getSetoid(setoidJSON, setoidJSON);
    const observable = observe(cachedA, { foo: 1 }, resultSetoid);
    observable.subscribe(eventsSpy);
    await delay(10, void 0).run();
    observable.subscribe(eventsSpy);
    observable.subscribe(eventsSpy);

    expect(events).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: { foo: 1 }, loading: false },
      { type: 'Success', value: { foo: 1 }, loading: false },
      { type: 'Success', value: { foo: 1 }, loading: false }
    ]);
  });
});

it('map - resolves to `f(a)`', async () => {
  const a = queryStrict(() => taskEither.of('foo'), refetch);
  const b = map(a, (s: string) => s.length);
  const r = await b.run().run();
  expect(r).toEqual(right(3));
});

it('map - invalidating `a` causes an invalidation of `f(a)`', async () => {
  const f1 = jest.fn(() => taskEither.of('foo'));
  const a = queryStrict(f1, refetch);
  const f2 = jest.fn((s: string) => s.length);
  const b = map(a, f2);
  const resultSetoid = getSetoid(setoidStrict, setoidStrict);
  const observable = observe(b, undefined, resultSetoid);
  const observer = jest.fn();
  observable.subscribe(observer);
  await delay(10, void 0).run();
  expect(f1.mock.calls.length).toBe(1);
  expect(f2.mock.calls.length).toBe(1);
  expect(observer.mock.calls.length).toBe(2); // pending + value
  await a.invalidate().run();
  expect(f1.mock.calls.length).toBe(2);
  expect(f2.mock.calls.length).toBe(1); // not called again since map internally uses `available`
  expect(observer.mock.calls.length).toBe(4); // (pending + value) * 2
});
