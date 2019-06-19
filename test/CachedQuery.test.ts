import { taskEither, fromLeft } from 'fp-ts/lib/TaskEither';
import { queryShallow } from '../src/Query';
import { refetch, available, expire } from '../src/Strategy';
import { makeTestFetch, observeNShallow } from './utils/testFetch';
import { right, left } from 'fp-ts/lib/Either';
import { loading, success, failure } from '../src/QueryResult';

describe('CachedQuery', () => {
  describe('refetch', () => {
    describe('run()', () => {
      it('viene chiamata una volta la fetch e run torna il risultato successful', async () => {
        const fetch = makeTestFetch([(n: number) => taskEither.of(n * 2)]);
        const query = queryShallow(fetch, refetch);
        const result = await query.run(1).run();
        fetch.assertExhausted();
        expect(result).toEqual(right(2));
      });

      it('viene chiamata una volta una fetch che fallisce sempre e run ritorna il fallimento', async () => {
        const fetch = makeTestFetch([() => fromLeft('nope')]);
        const query = queryShallow(fetch, refetch);
        const result = await query.run().run();
        fetch.assertExhausted();
        expect(result).toEqual(left('nope'));
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run e la fetch esegue nuovamente con successo ritornando il nuovo risultato', async () => {
        const fetch = makeTestFetch([
          (n: number) => taskEither.of(n * 2),
          (n: number) => taskEither.of(n / 2)
        ]);
        const query = queryShallow(fetch, refetch);
        await query.run(2).run();
        const result = await query.run(2).run();
        expect(result).toEqual(right(1));
        fetch.assertExhausted();
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run e la fetch esegue nuovamente fallendo e ritornando il fallimento', async () => {
        const fetch = makeTestFetch([
          (n: number) => taskEither.of(n * 2),
          () => fromLeft('nope')
        ]);
        const query = queryShallow(fetch, refetch);
        await query.run(1).run();
        const result = await query.run(1).run();
        expect(result).toEqual(left('nope'));
        fetch.assertExhausted();
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run e la fetch esegue nuovamente con successo ritornando il nuovo valore', async () => {
        const fetch = makeTestFetch([
          () => fromLeft('nope'),
          (n: number) => taskEither.of(n * 2)
        ]);
        const query = queryShallow(fetch, refetch);
        await query.run(1).run();
        const result = await query.run(1).run();
        expect(result).toEqual(right(2));
        fetch.assertExhausted();
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run e la fetch riesegue fallendo nuovamente ritornando il nuovo valore di failure', async () => {
        const fetch = makeTestFetch([
          (_: number) => fromLeft('nope'),
          (_: number) => fromLeft('nope2')
        ]);
        const query = queryShallow(fetch, refetch);
        await query.run(1).run();
        const result = await query.run(1).run();
        expect(result).toEqual(left('nope2'));
        fetch.assertExhausted();
      });
    });

    describe('observe()', async () => {
      it('viene chiamata una volta la fetch e run torna il risultato successful', async () => {
        const fetch = makeTestFetch([(n: number) => taskEither.of(n * 2)]);
        const query = queryShallow(fetch, refetch);
        const results = observeNShallow(2, query, 1);
        await query.run(1).run();
        expect(await results).toEqual([loading, success(2, false)]);
      });

      it('viene chiamata una volta una fetch che fallisce sempre e run ritorna il fallimento', async () => {
        const fetch = makeTestFetch([() => fromLeft('nope')]);
        const query = queryShallow(fetch, refetch);
        const results = observeNShallow(2, query);
        await query.run().run();
        expect(await results).toEqual([loading, failure('nope', false)]);
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run e la fetch esegue nuovamente con successo ritornando il nuovo risultato', async () => {
        const fetch = makeTestFetch([
          (n: number) => taskEither.of(n * 2),
          (n: number) => taskEither.of(n / 2)
        ]);
        const query = queryShallow(fetch, refetch);
        const results = observeNShallow(4, query, 2);
        await query.run(2).run();
        await query.run(2).run();
        expect(await results).toEqual([
          loading,
          success(4, false),
          loading,
          success(1, false)
        ]);
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run e la fetch esegue nuovamente fallendo e ritornando il fallimento', async () => {
        const fetch = makeTestFetch([
          (n: number) => taskEither.of(n * 2),
          () => fromLeft('nope')
        ]);
        const query = queryShallow(fetch, refetch);
        const results = observeNShallow(4, query, 1);
        await query.run(1).run();
        await query.run(1).run();
        expect(await results).toEqual([
          loading,
          success(2, false),
          loading,
          failure('nope', false)
        ]);
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run e la fetch esegue nuovamente con successo ritornando il nuovo valore', async () => {
        const fetch = makeTestFetch([
          () => fromLeft('nope'),
          (n: number) => taskEither.of(n * 2)
        ]);
        const query = queryShallow(fetch, refetch);
        const results = observeNShallow(4, query, 1);
        await query.run(1).run();
        await query.run(1).run();
        expect(await results).toEqual([
          loading,
          failure('nope', false),
          loading,
          success(2, false)
        ]);
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run e la fetch riesegue fallendo nuovamente ritornando il nuovo valore di failure', async () => {
        const fetch = makeTestFetch([
          (_: number) => fromLeft('nope'),
          (_: number) => fromLeft('nope2')
        ]);
        const query = queryShallow(fetch, refetch);
        const results = observeNShallow(4, query, 1);
        await query.run(1).run();
        await query.run(1).run();
        expect(await results).toEqual([
          loading,
          failure('nope', false),
          loading,
          failure('nope2', false)
        ]);
      });
    });
  });

  describe('available', () => {
    describe('run()', () => {
      it('viene chiamata una volta la fetch e run torna il risultato successful', async () => {
        const fetch = makeTestFetch([(n: number) => taskEither.of(n * 2)]);
        const query = queryShallow(fetch, available);
        const result = await query.run(1).run();
        expect(result).toEqual(right(2));
        fetch.assertExhausted();
      });

      it('viene chiamata una volta una fetch che fallisce sempre e run ritorna il fallimento', async () => {
        const fetch = makeTestFetch([(_: number) => fromLeft('nope')]);
        const query = queryShallow(fetch, available);
        const result = await query.run(1).run();
        expect(result).toEqual(left('nope'));
        fetch.assertExhausted();
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run, la fetch NON esegue e viene ritornato il precedente risultato', async () => {
        const fetch = makeTestFetch([(n: number) => taskEither.of(n * 2)]);
        const query = queryShallow(fetch, available);
        await query.run(1).run();
        const result = await query.run(1).run();
        expect(result).toEqual(right(2));
        fetch.assertExhausted();
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run, la fetch esegue nuovamente fallendo e viene ritornato il nuovo risultato di failure', async () => {
        const fetch = makeTestFetch([
          (_: number) => fromLeft('nope'),
          (_: number) => fromLeft('nope2')
        ]);
        const query = queryShallow(fetch, available);
        await query.run(1).run();
        const result = await query.run(1).run();
        expect(result).toEqual(left('nope2'));
        fetch.assertExhausted();
      });
    });

    describe('invalidate()', () => {
      it('dopo avere eseguito run con successo una volta, viene chiamata invalidate, la fetch esegue nuovamente e viene ritornato un nuovo successo', async () => {
        const fetch = makeTestFetch([
          (n: number) => taskEither.of(n * 2),
          (n: number) => taskEither.of(n / 2)
        ]);
        const query = queryShallow(fetch, available);
        await query.run(2).run();
        const result = await query.invalidate(2).run();
        expect(result).toEqual(right(1));
        fetch.assertExhausted();
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata invalidate, la fetch esegue nuovamente fallendo e viene ritornato il nuovo risultato di failure', async () => {
        const fetch = makeTestFetch([
          (_: number) => fromLeft('nope'),
          (_: number) => fromLeft('nope2')
        ]);
        const query = queryShallow(fetch, available);
        await query.run(2).run();
        const result = await query.invalidate(2).run();
        expect(result).toEqual(left('nope2'));
        fetch.assertExhausted();
      });
    });
  });

  describe('expire', () => {
    describe('run()', () => {
      it('viene chiamata una volta la fetch e run torna il risultato successful', async () => {
        const fetch = makeTestFetch([(n: number) => taskEither.of(n * 2)]);
        const query = queryShallow(fetch, expire(1000));
        const result = await query.run(2).run();
        expect(result).toEqual(right(4));
        fetch.assertExhausted();
      });

      it('viene chiamata una volta una fetch che fallisce sempre e run ritorna il fallimento', async () => {
        const fetch = makeTestFetch([(_: number) => fromLeft('nope')]);
        const query = queryShallow(fetch, expire(1000));
        const result = await query.run(2).run();
        expect(result).toEqual(left('nope'));
        fetch.assertExhausted();
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run prima che siano passati `ms`, la fetch NON esegue e lo stesso valore viene ritornato', async () => {
        const fetch = makeTestFetch([(n: number) => taskEither.of(n * 2)]);
        const query = queryShallow(fetch, expire(1000));
        await query.run(2).run();
        fetch.assertExhausted();
        const result = await query.run(2).run();
        expect(result).toEqual(result);
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run dopo che sono passati `ms` e la fetch esegue nuovamente con successo ritornando il nuovo risultato', async () => {
        const fetch = makeTestFetch([
          (n: number) => taskEither.of(n * 2),
          (n: number) => taskEither.of(n / 2)
        ]);
        const query = queryShallow(fetch, expire(10));
        await query.run(2).run();
        await new Promise(r => setTimeout(r, 11));
        const result = await query.run(2).run();
        expect(result).toEqual(right(1));
        fetch.assertExhausted();
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run dopo che sono passati `ms` e la fetch esegue nuovamente fallendo e ritornando il fallimento', async () => {
        const fetch = makeTestFetch([
          (n: number) => taskEither.of(n * 2),
          (_: number) => fromLeft('nope')
        ]);
        const query = queryShallow(fetch, expire(10));
        await query.run(2).run();
        await new Promise(r => setTimeout(r, 11));
        const result = await query.run(2).run();
        expect(result).toEqual(left('nope'));
        fetch.assertExhausted();
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run prima che siano passati `ms` e la fetch esegue nuovamente fallendo e tornando il nuovo fallimento', async () => {
        const fetch = makeTestFetch([
          (_: number) => fromLeft('nope'),
          (_: number) => fromLeft('nope2')
        ]);
        const query = queryShallow(fetch, expire(10));
        await query.run(2).run();
        await new Promise(r => setTimeout(r, 11));
        const result = await query.run(2).run();
        expect(result).toEqual(left('nope2'));
        fetch.assertExhausted();
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run dopo che sono passati `ms` e la fetch esegue nuovamente con successo e ritorna il successo', async () => {
        const fetch = makeTestFetch([
          (_: number) => fromLeft('nope'),
          (n: number) => taskEither.of(n * 2)
        ]);
        const query = queryShallow(fetch, expire(10));
        await query.run(2).run();
        await new Promise(r => setTimeout(r, 11));
        const result = await query.run(2).run();
        expect(result).toEqual(right(4));
        fetch.assertExhausted();
      });
    });
  });
});
