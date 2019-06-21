import { query, queryStrict } from '../src/Query';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { setoidNumber, setoidString } from 'fp-ts/lib/Setoid';
import { available, setoidStrict, refetch } from '../src/Strategy';
import { getSetoid, CacheValue } from '../src/CacheValue';
import { invalidate } from '../src/invalidate';
import { observe } from '../src/observe';
// import { take, toArray } from 'rxjs/operators';
import { delay } from 'fp-ts/lib/Task';
import { QueryResult } from '../src/QueryResult';

describe('invalidate', () => {
  it('should invalidate a set of queries', async () => {
    let events: CacheValue<unknown, unknown>[] = [];
    const eventsSpy = jest.fn(e => events.push(e));
    const aSpy = jest.fn((a: number) => taskEither.of(a * 2));
    const bSpy = jest.fn((b: string) => taskEither.of(b.length));
    const a = query(aSpy)(
      available(setoidNumber, getSetoid(setoidStrict, setoidNumber))
    );
    const b = query(bSpy)(
      available(setoidString, getSetoid(setoidStrict, setoidNumber))
    );

    // run queries once first
    observe(a, 1, setoidStrict).subscribe(eventsSpy);
    observe(b, 'foo', setoidStrict).subscribe(eventsSpy);
    await delay(10, void 0);

    // invalidate
    invalidate({ a, b }, { a: 1, b: 'foo' });
    expect(aSpy.mock.calls.length).toBe(2);
    expect(bSpy.mock.calls.length).toBe(2);
  });

  it('should work when omitting void query input params', async () => {
    let events: CacheValue<unknown, unknown>[] = [];
    const aSpy = jest.fn(() => taskEither.of(2));
    const a = queryStrict(aSpy, available);
    const eventsSpy = jest.fn(e => events.push(e));

    // run once
    observe(a, undefined, setoidStrict).subscribe(eventsSpy);
    await delay(10, void 0);
    expect(aSpy.mock.calls.length).toBe(1);

    // invalidate
    invalidate({ a });
    await delay(10, void 0);
    expect(aSpy.mock.calls.length).toBe(2);
  });

  fit('observers should see updated events after an invalidate', async () => {
    let events: QueryResult<unknown, unknown>[] = [];
    const aSpy = jest.fn(() => taskEither.of(2));
    const a = queryStrict(aSpy, refetch);
    const eventsSpy = jest.fn(e => events.push(e));

    // run once
    observe(a, undefined, setoidStrict).subscribe(eventsSpy);
    await delay(10, void 0);

    // invalidate
    invalidate({ a });
    await delay(10, void 0);

    expect(events).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 2, loading: false },
      { type: 'Loading' },
      { type: 'Success', value: 2, loading: false }
    ]);
  });
});
