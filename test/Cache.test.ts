import { Cache } from '../src/Cache';
import { taskEither, TaskEither } from 'fp-ts/lib/TaskEither';
import { setoidString, setoidNumber } from 'fp-ts/lib/Setoid';
import { delay } from 'fp-ts/lib/Task';
import { available, refetch, expire, setoidStrict } from '../src/Strategy';
import { right } from 'fp-ts/lib/Either';
import { getSetoid } from '../src/CacheValue';

describe('Cache', () => {
  describe('getOrFetch', () => {
    it('available: should cache results idefinitely', async () => {
      const fetchSpy = jest.fn((s: string) =>
        taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(
        fetchSpy,
        available(setoidString, getSetoid(setoidStrict, setoidNumber))
      );
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      await delay(20, void 0).run();
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
    });

    it('refetch: should reuse current pending', async () => {
      const fetchSpy = jest.fn(
        (s: string) =>
          new TaskEither<string, number>(delay(20, right(s.length)))
      );
      const cache = new Cache(
        fetchSpy,
        refetch(setoidString, getSetoid(setoidStrict, setoidNumber))
      );
      await Promise.all([
        cache.getOrFetch('foo').run(),
        cache.getOrFetch('foo').run()
      ]);
      expect(fetchSpy.mock.calls.length).toBe(1);
    });

    it('refetch: should never cache results', async () => {
      const fetchSpy = jest.fn((s: string) =>
        taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(
        fetchSpy,
        refetch(setoidString, getSetoid(setoidStrict, setoidNumber))
      );
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      await delay(20, void 0).run();
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(2);
    });

    it('expire: should reuse cache result up to n ms after', async () => {
      const fetchSpy = jest.fn((s: string) =>
        taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(
        fetchSpy,
        expire(20)(setoidString, getSetoid(setoidStrict, setoidNumber))
      );
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      await delay(10, void 0).run();
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      await delay(10, void 0).run();
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(2);
    });
  });

  describe('invalidate', () => {
    it('should delete the cached result before requesting it again', async () => {
      const fetchSpy = jest.fn((s: string) =>
        taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(
        fetchSpy,
        available(setoidString, getSetoid(setoidStrict, setoidNumber))
      );
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      await cache.invalidate('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(2);
    });
  });

  describe('gc', () => {
    it('should remove all subjects that are not currently observed', async () => {
      const af = jest.fn((s: string) =>
        taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(
        af,
        refetch(setoidString, getSetoid(setoidString, setoidNumber))
      );
      const sfoo = cache.observe('foo').subscribe();
      cache.observe('bar').subscribe();
      cache.observe('baz').subscribe();
      sfoo.unsubscribe();
      expect((cache as any).subjects.size).toBe(3);
      cache.gc();
      expect((cache as any).subjects.size).toBe(2);
    });
  });
});
