import { Cache } from '../src/Cache';
import * as TE from 'fp-ts/lib/TaskEither';
import * as Eq from 'fp-ts/lib/Eq';
import * as T from 'fp-ts/lib/Task';
import * as S from '../src/Strategy';
import * as CV from '../src/CacheValue';
import { cacheValueToQueryResult } from '../src/observe';

const cacheValueEq = CV.getEq(Eq.eqStrict, Eq.eqNumber);

describe('Cache', () => {
  describe('getOrFetch', () => {
    it('available: should cache results idefinitely', async () => {
      let events: CV.CacheValue<unknown, unknown>[] = [];
      const fetchSpy = jest.fn((s: string) =>
        TE.taskEither.of<string, number>(s.length)
      );
      const eventsSpy = jest.fn(e => events.push(e));
      const cache = new Cache(fetchSpy, S.available(Eq.eqString, cacheValueEq));
      const observable = cache.observe('foo');
      observable.subscribe(eventsSpy);
      await T.delay(10)(T.of(null))();
      observable.subscribe(eventsSpy);
      await T.delay(10)(T.of(null))();
      expect(fetchSpy.mock.calls.length).toBe(1);
      expect(events.map(cacheValueToQueryResult)).toEqual([
        { _tag: 'Loading' },
        { loading: false, _tag: 'Success', success: 3 },
        { loading: false, _tag: 'Success', success: 3 }
      ]);
    });

    it('refetch: should reuse current pending', async () => {
      let events: CV.CacheValue<unknown, unknown>[] = [];
      const eventsSpy = jest.fn(e => events.push(e));
      const fetchSpy = jest.fn((s: string) =>
        TE.taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(fetchSpy, S.refetch(Eq.eqString, cacheValueEq));
      const observable = cache.observe('foo');
      observable.subscribe(eventsSpy);
      const observable2 = cache.observe('foo');
      observable2.subscribe(eventsSpy);
      await T.delay(10)(T.of(null))();

      // every observable & subscriprion gets all the events but the data is only fetched once
      expect(fetchSpy.mock.calls.length).toBe(1);
      expect(events.map(cacheValueToQueryResult)).toEqual([
        { _tag: 'Loading' },
        { _tag: 'Loading' },
        { success: 3, loading: false, _tag: 'Success' },
        { success: 3, loading: false, _tag: 'Success' }
      ]);
    });

    it('refetch: should never cache results', async () => {
      let events: CV.CacheValue<unknown, unknown>[] = [];
      let events2: CV.CacheValue<unknown, unknown>[] = [];
      const eventsSpy = jest.fn(e => events.push(e));
      const eventsSpy2 = jest.fn(e => events2.push(e));
      const fetchSpy = jest.fn((s: string) =>
        TE.taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(fetchSpy, S.refetch(Eq.eqString, cacheValueEq));
      const observable = cache.observe('foo');
      await T.delay(10)(T.of(null))();
      observable.subscribe(eventsSpy);
      await T.delay(10)(T.of(null))();
      const observable2 = cache.observe('foo');
      await T.delay(10)(T.of(null))();
      observable2.subscribe(eventsSpy2);
      await T.delay(100)(T.of(null))();

      expect(fetchSpy.mock.calls.length).toBe(2);

      // the first observable should be notified about all events at value "foo"
      expect(events.map(cacheValueToQueryResult)).toEqual([
        { _tag: 'Loading' },
        { success: 3, loading: false, _tag: 'Success' },
        { _tag: 'Loading' },
        { success: 3, loading: false, _tag: 'Success' }
      ]);

      // the second observable should be notified only about all events at value "foo" occurred after someone subscribed to it
      expect(events2.map(cacheValueToQueryResult)).toEqual([
        { _tag: 'Loading' },
        { success: 3, loading: false, _tag: 'Success' }
      ]);
    });

    it('expire: should reuse cache result up to n ms after', async () => {
      let events: CV.CacheValue<unknown, unknown>[] = [];
      let events2: CV.CacheValue<unknown, unknown>[] = [];
      const eventsSpy = jest.fn(e => events.push(e));
      const eventsSpy2 = jest.fn(e => events2.push(e));
      const fetchSpy = jest.fn((s: string) =>
        TE.taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(
        fetchSpy,
        S.expire(20)(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
      );

      const observable = cache.observe('foo');
      observable.subscribe(eventsSpy);
      await T.delay(10)(T.of(null))();
      const observable2 = cache.observe('foo');
      observable2.subscribe(eventsSpy2);

      expect(fetchSpy.mock.calls.length).toBe(1);
      // first one receives a loading and a success
      expect(events.map(cacheValueToQueryResult)).toEqual([
        { _tag: 'Loading' },
        { success: 3, loading: false, _tag: 'Success' }
      ]);

      // second one receives only a success
      expect(events2.map(cacheValueToQueryResult)).toEqual([
        { success: 3, loading: false, _tag: 'Success' }
      ]);
    });

    it('expire: should refetch cache result after n ms passed', async () => {
      let events: CV.CacheValue<unknown, unknown>[] = [];
      let events2: CV.CacheValue<unknown, unknown>[] = [];
      const eventsSpy = jest.fn(e => events.push(e));
      const eventsSpy2 = jest.fn(e => events2.push(e));
      const fetchSpy = jest.fn((s: string) =>
        TE.taskEither.of<string, number>(s.length)
      );
      const cache = new Cache(
        fetchSpy,
        S.expire(10)(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
      );

      const observable = cache.observe('foo');
      observable.subscribe(eventsSpy);
      await T.delay(20)(T.of(null))();
      const observable2 = cache.observe('foo');
      observable2.subscribe(eventsSpy2);
      await T.delay(5)(T.of(null))();

      expect(fetchSpy.mock.calls.length).toBe(2);

      expect(events.map(cacheValueToQueryResult)).toEqual([
        { _tag: 'Loading' },
        { success: 3, loading: false, _tag: 'Success' },
        { _tag: 'Loading' },
        { success: 3, loading: false, _tag: 'Success' }
      ]);

      expect(events2.map(cacheValueToQueryResult)).toEqual([
        { _tag: 'Loading' },
        { success: 3, loading: false, _tag: 'Success' }
      ]);
    });
  });
});
