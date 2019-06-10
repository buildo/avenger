import { TaskEither } from 'fp-ts/lib/TaskEither';
import { queryShallow, StrategyBuilder } from '../src/Query';
import { refetch, available, expire } from '../src/Strategy';
import { StatefulFetch } from './utils/StatefulFetch';

async function runQueryShallow<A>(
  _fetchFunction: () => TaskEither<string, string>,
  input: A,
  strategy: StrategyBuilder<A, string, string>
) {
  const fetchFunction = jest.fn(_fetchFunction);
  const query = queryShallow(fetchFunction, strategy);
  const result = await query.run(input).run();
  return { fetchFunction, result, query };
}

describe('CachedQuery', () => {
  describe('refetch', () => {
    describe('run()', () => {
      it('viene chiamata una volta la fetch e run torna il risultato successful', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysTheSame'
        }).fetch;
        const { fetchFunction, result } = await runQueryShallow(
          fetch,
          1,
          refetch
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isRight()).toBe(true);
      });

      it('viene chiamata una volta una fetch che fallisce sempre e run ritorna il fallimento', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysFailure',
          resultType: 'alwaysTheSame'
        }).fetch;
        const { fetchFunction, result } = await runQueryShallow(
          fetch,
          1,
          refetch
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isLeft()).toBe(true);
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run e la fetch esegue nuovamente con successo ritornando il nuovo risultato', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          refetch
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isRight()).toBe(true);
        const result2 = await query.run(1).run();
        expect(fetchFunction.mock.calls.length).toBe(2);
        expect(result2.isRight()).toBe(true);
        expect(result2.getOrElse('') !== result.getOrElse('')).toBe(true);
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run e la fetch esegue nuovamente fallendo e ritornando il fallimento', async () => {
        const fetch = new StatefulFetch({
          order: 'successFirst',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          refetch
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isRight()).toBe(true);
        const result2 = await query.run(1).run();
        expect(fetchFunction.mock.calls.length).toBe(2);
        expect(result2.isLeft()).toBe(true);
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run e la fetch esegue nuovamente con successo ritornando il nuovo valore', async () => {
        const fetch = new StatefulFetch({
          order: 'failureFirst',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          refetch
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isLeft()).toBe(true);
        const result2 = await query.run(1).run();
        expect(fetchFunction.mock.calls.length).toBe(2);
        expect(result2.isRight()).toBe(true);
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run e la fetch riesegue fallendo nuovamente ritornando il nuovo valore di failure', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysFailure',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          refetch
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isLeft()).toBe(true);
        const result2 = await query.run(1).run();
        expect(fetchFunction.mock.calls.length).toBe(2);
        expect(result2.isLeft()).toBe(true);

        expect(
          result2.swap().getOrElse('') !== result.swap().getOrElse('')
        ).toBe(true);
      });
    });
  });

  describe('available', () => {
    describe('run()', () => {
      it('viene chiamata una volta la fetch e run torna il risultato successful', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysTheSame'
        }).fetch;
        const { fetchFunction, result } = await runQueryShallow(
          fetch,
          1,
          available
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isRight()).toBe(true);
      });

      it('viene chiamata una volta una fetch che fallisce sempre e run ritorna il fallimento', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysFailure',
          resultType: 'alwaysTheSame'
        }).fetch;
        const { fetchFunction, result } = await runQueryShallow(
          fetch,
          1,
          available
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isLeft()).toBe(true);
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run, la fetch NON esegue e viene ritornato il precedente risultato', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          available
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isRight()).toBe(true);
        const result2 = await query.run(1).run();
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result2.getOrElse('') === result.getOrElse('')).toBe(true);
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run, la fetch esegue nuovamente fallendo e viene ritornato il nuovo risultato di failure', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysFailure',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          available
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isLeft()).toBe(true);
        const result2 = await query.run(1).run();
        expect(fetchFunction.mock.calls.length).toBe(2);
        expect(
          result2.swap().getOrElse('') !== result.swap().getOrElse('')
        ).toBe(true);
      });
    });

    describe('invalidate()', () => {
      it('dopo avere eseguito run con successo una volta, viene chiamata invalidate, la fetch esegue nuovamente e viene ritornato il precedente risultato', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          available
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isRight()).toBe(true);
        const result2 = await query.invalidate(1).run();
        expect(fetchFunction.mock.calls.length).toBe(2);
        expect(result2.getOrElse('') === result.getOrElse('')).toBe(false);
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata invalidate, la fetch esegue nuovamente fallendo e viene ritornato il nuovo risultato di failure', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysFailure',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          available
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isLeft()).toBe(true);
        const result2 = await query.invalidate(1).run();
        expect(fetchFunction.mock.calls.length).toBe(2);
        expect(
          result2.swap().getOrElse('') !== result.swap().getOrElse('')
        ).toBe(true);
      });
    });
  });

  describe('expire', () => {
    describe('run()', () => {
      it('viene chiamata una volta la fetch e run torna il risultato successful', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result } = await runQueryShallow(
          fetch,
          1,
          expire(1000)
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isRight()).toBe(true);
      });

      it('viene chiamata una volta una fetch che fallisce sempre e run ritorna il fallimento', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysFailure',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result } = await runQueryShallow(
          fetch,
          1,
          expire(1000)
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isLeft()).toBe(true);
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run prima che siano passati `ms`, la fetch NON esegue e lo stesso valore viene ritornato', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          expire(1000)
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isRight()).toBe(true);
        const result2 = await query.run(1).run();
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result2.isRight()).toBe(true);
        expect(result2.getOrElse('') === result.getOrElse('')).toBe(true);
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run dopo che sono passati `ms` e la fetch esegue nuovamente con successo ritornando il nuovo risultato', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          expire(10)
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isRight()).toBe(true);
        await new Promise(r => setTimeout(r, 20));
        const result2 = await query.run(1).run();
        expect(result2.isRight()).toBe(true);
        expect(fetchFunction.mock.calls.length).toBe(2);
        expect(result2.getOrElse('') !== result.getOrElse('')).toBe(true);
      });

      it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run dopo che sono passati `ms` e la fetch esegue nuovamente fallendo e ritornando il fallimento', async () => {
        const fetch = new StatefulFetch({
          order: 'successFirst',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          expire(10)
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isRight()).toBe(true);
        await new Promise(r => setTimeout(r, 20));
        const result2 = await query.run(1).run();
        expect(result2.isLeft()).toBe(true);
        expect(fetchFunction.mock.calls.length).toBe(2);
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run prima che siano passati `ms` e la fetch esegue nuovamente fallendo e tornando il nuovo fallimento', async () => {
        const fetch = new StatefulFetch({
          order: 'alwaysFailure',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          expire(1000)
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isLeft()).toBe(true);
        const result2 = await query.run(1).run();
        expect(result2.isLeft()).toBe(true);
        expect(fetchFunction.mock.calls.length).toBe(2);
      });

      it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run dopo che sono passati `ms` e la fetch esegue nuovamente con successo e ritorna il successo', async () => {
        const fetch = new StatefulFetch({
          order: 'failureFirst',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { fetchFunction, result, query } = await runQueryShallow(
          fetch,
          1,
          expire(10)
        );
        expect(fetchFunction.mock.calls.length).toBe(1);
        expect(result.isLeft()).toBe(true);
        await new Promise(r => setTimeout(r, 20));
        const result2 = await query.run(1).run();
        expect(result2.isRight()).toBe(true);
        expect(fetchFunction.mock.calls.length).toBe(2);
      });
    });
  });
});
