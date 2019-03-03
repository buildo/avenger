import { Cache } from '../src/Cache';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { setoidString } from 'fp-ts/lib/Setoid';

describe('Cache', () => {
  describe('getOrFetch', () => {
    it('Should cache results', async () => {
      const fetchObj = {
        fetch: (s: string) => taskEither.of<string, number>(s.length)
      };
      const fetchSpy = jest.spyOn(fetchObj, 'fetch');
      const cache = new Cache(fetchObj.fetch, setoidString);
      await cache.getOrFetch('foo');
      expect(fetchSpy.mock.calls.length).toBe(1);
      await cache.getOrFetch('foo');
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
      await cache.getOrFetch('foo');
      expect(fetchSpy.mock.calls.length).toBe(1);
      await cache.invalidate('foo');
      expect(fetchSpy.mock.calls.length).toBe(2);
    });
  });
});
