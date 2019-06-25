import { Cache } from '../src/Cache';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { setoidString, setoidNumber } from 'fp-ts/lib/Setoid';
import { delay } from 'fp-ts/lib/Task';
import { available, setoidStrict, refetch, expire } from '../src/Strategy';
import { getSetoid, CacheValue } from '../src/CacheValue';
import { cacheValueToQueryResult } from '../src/observe';

const cacheValueSetoid = getSetoid(setoidStrict, setoidNumber);

describe('Cache', () => {
  describe('getOrFetch', () => {
    it('available: should cache results idefinitely', async () => {
      let events: CacheValue<unknown, unknown>[] = [];
      const fetchSpy = jest.fn((s: string) =>
        taskEither.of<string, number>(s.length)
      );
      const eventsSpy = jest.fn(e => events.push(e));
      const cache = new Cache(
        fetchSpy,
        available(setoidString, cacheValueSetoid)
      );
      const observable = cache.observe('foo');
      observable.subscribe(eventsSpy);
      await delay(10, void 0).run();
      observable.subscribe(eventsSpy);
      await delay(10, void 0).run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      expect(events.map(cacheValueToQueryResult)).toEqual([
        { type: 'Loading' },
        { loading: false, type: 'Success', value: 3 },
        { loading: false, type: 'Success', value: 3 }
      ]);
    });

    it('refetch: should reuse current pending', async () => {
      let events: CacheValue<unknown, unknown>[] = [];
      const eventsSpy = jest.fn(e => events.push(e));
      const fetchSpy = jest.fn((s: string) =>
        taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(
        fetchSpy,
        refetch(setoidString, cacheValueSetoid)
      );
      const observable = cache.observe('foo');
      observable.subscribe(eventsSpy);
      const observable2 = cache.observe('foo');
      observable2.subscribe(eventsSpy);
      await delay(10, void 0).run();

      // every observable & subscriprion gets all the events but the data is only fetched once
      expect(fetchSpy.mock.calls.length).toBe(1);
      expect(events.map(cacheValueToQueryResult)).toEqual([
        { type: 'Loading' },
        { type: 'Loading' },
        { value: 3, loading: false, type: 'Success' },
        { value: 3, loading: false, type: 'Success' }
      ]);
    });

    it('refetch: should never cache results', async () => {
      let events: CacheValue<unknown, unknown>[] = [];
      let events2: CacheValue<unknown, unknown>[] = [];
      const eventsSpy = jest.fn(e => events.push(e));
      const eventsSpy2 = jest.fn(e => events2.push(e));
      const fetchSpy = jest.fn((s: string) =>
        taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(
        fetchSpy,
        refetch(setoidString, cacheValueSetoid)
      );
      const observable = cache.observe('foo');
      await delay(10, void 0).run();
      observable.subscribe(eventsSpy);
      await delay(10, void 0).run();
      const observable2 = cache.observe('foo');
      await delay(10, void 0).run();
      observable2.subscribe(eventsSpy2);
      await delay(100, void 0);

      expect(fetchSpy.mock.calls.length).toBe(2);

      // the first observable should be notified about all events at value "foo"
      expect(events.map(cacheValueToQueryResult)).toEqual([
        { type: 'Loading' },
        { value: 3, loading: false, type: 'Success' },
        { type: 'Loading' },
        { value: 3, loading: false, type: 'Success' }
      ]);

      // the second observable should be notified only about all events at value "foo" occurred after someone subscribed to it
      expect(events2.map(cacheValueToQueryResult)).toEqual([
        { type: 'Loading' },
        { value: 3, loading: false, type: 'Success' }
      ]);
    });

    it('expire: should reuse cache result up to n ms after', async () => {
      let events: CacheValue<unknown, unknown>[] = [];
      let events2: CacheValue<unknown, unknown>[] = [];
      const eventsSpy = jest.fn(e => events.push(e));
      const eventsSpy2 = jest.fn(e => events2.push(e));
      const fetchSpy = jest.fn((s: string) =>
        taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(
        fetchSpy,
        expire(20)(setoidString, getSetoid(setoidStrict, setoidNumber))
      );

      const observable = cache.observe('foo');
      observable.subscribe(eventsSpy);
      await delay(10, void 0).run();
      const observable2 = cache.observe('foo');
      observable2.subscribe(eventsSpy2);

      expect(fetchSpy.mock.calls.length).toBe(1);
      // first one receives a loading and a success
      expect(events.map(cacheValueToQueryResult)).toEqual([
        { type: 'Loading' },
        { value: 3, loading: false, type: 'Success' }
      ]);

      // second one receives only a success
      expect(events2.map(cacheValueToQueryResult)).toEqual([
        { value: 3, loading: false, type: 'Success' }
      ]);
    });

    it('expire: should refetch cache result after n ms passed', async () => {
      let events: CacheValue<unknown, unknown>[] = [];
      let events2: CacheValue<unknown, unknown>[] = [];
      const eventsSpy = jest.fn(e => events.push(e));
      const eventsSpy2 = jest.fn(e => events2.push(e));
      const fetchSpy = jest.fn((s: string) =>
        taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(
        fetchSpy,
        expire(10)(setoidString, getSetoid(setoidStrict, setoidNumber))
      );

      const observable = cache.observe('foo');
      observable.subscribe(eventsSpy);
      await delay(20, void 0).run();
      const observable2 = cache.observe('foo');
      observable2.subscribe(eventsSpy2);
      await delay(5, void 0).run();

      expect(fetchSpy.mock.calls.length).toBe(2);

      expect(events.map(cacheValueToQueryResult)).toEqual([
        { type: 'Loading' },
        { value: 3, loading: false, type: 'Success' },
        { type: 'Loading' },
        { value: 3, loading: false, type: 'Success' }
      ]);

      expect(events2.map(cacheValueToQueryResult)).toEqual([
        { type: 'Loading' },
        { value: 3, loading: false, type: 'Success' }
      ]);
    });
  });
});
