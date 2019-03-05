import { Cache } from '../src/Cache';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { setoidString } from 'fp-ts/lib/Setoid';
import { delay } from 'fp-ts/lib/Task';

describe('Cache', () => {
  describe('getOrFetch', () => {
    it('Should reuse current pending', async () => {
      const fetchObj = {
        fetch: (s: string) => taskEither.of<string, number>(s.length)
      };
      const fetchSpy = jest.spyOn(fetchObj, 'fetch');
      const cache = new Cache(fetchObj.fetch, setoidString);
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
    });

    it('Should cache results idefinitely', async () => {
      const fetchObj = {
        fetch: (s: string) => taskEither.of<string, number>(s.length)
      };
      const fetchSpy = jest.spyOn(fetchObj, 'fetch');
      const cache = new Cache(fetchObj.fetch, setoidString);
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      await delay(20, void 0).run();
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
    });
  });

  describe('invalidate', () => {
    it('Should delete the cached result before requesting it again', async () => {
      const fetchObj = {
        fetch: (s: string) => taskEither.of<string, number>(s.length)
      };
      const fetchSpy = jest.spyOn(fetchObj, 'fetch');
      const cache = new Cache(fetchObj.fetch, setoidString);
      await cache.getOrFetch('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(1);
      await cache.invalidate('foo').run();
      expect(fetchSpy.mock.calls.length).toBe(2);
    });
  });
});
