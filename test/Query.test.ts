import { taskEither } from 'fp-ts/lib/TaskEither';
import { observe } from '../src/observe';
import { queryStrict, queryShallow, queryJSON } from '../src/Query';
import { available, setoidStrict, setoidJSON, JSON } from '../src/Strategy';
import { QueryResult, getSetoid } from '../src/QueryResult';
import { delay } from 'fp-ts/lib/Task';

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
