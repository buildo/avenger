import { Cache } from '../src/Cache';
import { taskEither, TaskEither } from 'fp-ts/lib/TaskEither';
import { setoidString } from 'fp-ts/lib/Setoid';
import { delay } from 'fp-ts/lib/Task';
import { available, refetch, expire } from '../src/Strategy';
import { right } from 'fp-ts/lib/Either';

describe('Cache', () => {
  describe('getOrFetch', () => {
    it('available: should cache results idefinitely', async () => {
      const fetchObj = {
        fetch: (s: string) => taskEither.of<string, number>(s.length)
      };
      const fetchSpy = jest.spyOn(fetchObj, 'fetch');
      const cache = new Cache(fetchObj.fetch, available(setoidString));
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      await delay(20, void 0).run();
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
    });

    it('refetch: should reuse current pending', async () => {
      const fetchObj = {
        fetch: (s: string) =>
          new TaskEither<string, number>(delay(20, right(s.length)))
      };
      const fetchSpy = jest.spyOn(fetchObj, 'fetch');
      const cache = new Cache(fetchObj.fetch, refetch(setoidString));
      await Promise.all([
        cache.getOrFetch('foo').run(),
        cache.getOrFetch('foo').run()
      ]);
      expect(fetchSpy.mock.calls.length).toBe(1);
    });

    it('refetch: should never cache results', async () => {
      const fetchObj = {
        fetch: (s: string) => taskEither.of<string, number>(s.length)
      };
      const fetchSpy = jest.spyOn(fetchObj, 'fetch');
      const cache = new Cache(fetchObj.fetch, refetch(setoidString));
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      await delay(20, void 0).run();
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(2);
    });

    it('expire: should reuse cache result up to n ms after', async () => {
      const fetchObj = {
        fetch: (s: string) => taskEither.of<string, number>(s.length)
      };
      const fetchSpy = jest.spyOn(fetchObj, 'fetch');
      const cache = new Cache(fetchObj.fetch, expire(20)(setoidString));
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
    it('Should delete the cached result before requesting it again', async () => {
      const fetchObj = {
        fetch: (s: string) => taskEither.of<string, number>(s.length)
      };
      const fetchSpy = jest.spyOn(fetchObj, 'fetch');
      const cache = new Cache(fetchObj.fetch, available(setoidString));
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      await cache.invalidate('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(2);
    });
  });
});
