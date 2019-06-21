import { Cache } from '../src/Cache';
import { taskEither, TaskEither } from 'fp-ts/lib/TaskEither';
import { setoidString, setoidNumber } from 'fp-ts/lib/Setoid';
import { delay } from 'fp-ts/lib/Task';
import { available, setoidStrict, refetch } from '../src/Strategy';
// import { right } from 'fp-ts/lib/Either';
import { getSetoid, CacheValue } from '../src/CacheValue';
import { cacheValueToQueryResult } from '../src/observe';
import { right } from 'fp-ts/lib/Either';

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
      await delay(10, void 0);
      observable.subscribe(eventsSpy);
      await delay(10, void 0);
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
      const fetchSpy = jest.fn(
        (s: string) =>
          new TaskEither<string, number>(delay(20, right(s.length)))
      );
      const cache = new Cache(
        fetchSpy,
        refetch(setoidString, cacheValueSetoid)
      );
      const observable = cache.observe('foo');
      observable.subscribe(eventsSpy);
      observable.subscribe(eventsSpy);
      await delay(10, void 0);
      expect(fetchSpy.mock.calls.length).toBe(1);
      expect(events.map(cacheValueToQueryResult)).toEqual([
        { type: 'Loading' },
        { type: 'Loading' }
      ]);
    });

    //   it('refetch: should never cache results', async () => {
    //     const fetchSpy = jest.fn((s: string) =>
    //       taskEither.of<string, number>(s.length)
    //     );
    //     const cache = new Cache(
    //       fetchSpy,
    //       refetch(setoidString, getSetoid(setoidStrict, setoidNumber))
    //     );
    //     await cache.run('foo').run();
    //     expect(fetchSpy.mock.calls.length).toBe(1);
    //     await delay(20, void 0).run();
    //     await cache.run('foo').run();
    //     expect(fetchSpy.mock.calls.length).toBe(2);
    //   });

    //   it('expire: should reuse cache result up to n ms after', async () => {
    //     const fetchSpy = jest.fn((s: string) =>
    //       taskEither.of<string, number>(s.length)
    //     );
    //     const cache = new Cache(
    //       fetchSpy,
    //       expire(20)(setoidString, getSetoid(setoidStrict, setoidNumber))
    //     );
    //     await cache.run('foo').run();
    //     expect(fetchSpy.mock.calls.length).toBe(1);
    //     await cache.run('foo').run();
    //     expect(fetchSpy.mock.calls.length).toBe(1);
    //     await delay(10, void 0).run();
    //     await cache.run('foo').run();
    //     expect(fetchSpy.mock.calls.length).toBe(1);
    //     await delay(11, void 0).run();
    //     await cache.run('foo').run();
    //     expect(fetchSpy.mock.calls.length).toBe(2);
    //   });
    // });

    // describe('invalidate', () => {
    //   it('should delete the cached result before requesting it again', async () => {
    //     const fetchSpy = jest.fn((s: string) =>
    //       taskEither.of<string, number>(s.length)
    //     );
    //     const cache = new Cache(
    //       fetchSpy,
    //       available(setoidString, getSetoid(setoidStrict, setoidNumber))
    //     );
    //     await cache.run('foo').run();
    //     expect(fetchSpy.mock.calls.length).toBe(1);
    //     await cache.invalidate('foo').run();
    //     expect(fetchSpy.mock.calls.length).toBe(2);
    //   });
  });
});
