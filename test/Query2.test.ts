import { taskEither, fromLeft } from 'fp-ts/lib/TaskEither';
import { queryShallow } from '../src/Query';
import { refetch } from '../src/Strategy';
import { right, left } from 'fp-ts/lib/Either';

const fetchSucccess = (input: number) => taskEither.of<string, number>(input);
const fetchFailure = (_: number) => fromLeft<string, number>('nope');

async function runSuccessOnce(input: number) {
  const successF = jest.fn(fetchSucccess);
  const query = queryShallow(successF, refetch);
  const result = await query.run(input).run();
  return { successF, result, query };
}

async function runFailureOnce(input: number) {
  const failureF = jest.fn(fetchFailure);
  const query = queryShallow(failureF, refetch);
  const result = await query.run(input).run();
  return { failureF, result, query };
}

describe('ObservableQuery', () => {
  describe('CachedQuery', () => {
    //     - available
    //         - run()
    //         - viene chiamata una volta la fetch e run torna il risultato successful
    //         - viene chiamata una volta una fetch che fallisce sempre e run ritorna il fallimento
    //         - dopo avere eseguito run con successo una volta, viene chiamata di nuovo run e la fetch NON esegue
    //         - dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run e la fetch esegue nuovamente
    //     - expire(ms)
    //         - run()
    //         - viene chiamata una volta la fetch e run torna il risultato successful
    //         - viene chiamata una volta una fetch che fallisce sempre e run ritorna il fallimento
    //         - dopo avere eseguito run con successo una volta, viene chiamata di nuovo run prima che siano passati `ms` e la fetch NON esegue
    //         - dopo avere eseguito run con successo una volta, viene chiamata di nuovo run dopo che sono passati `ms` e la fetch esegue nuovamente
    //         - dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run prima che siano passati `ms` e la fetch esegue nuovamente
    //         - dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run dopo che sono passati `ms` e la fetch esegue nuovamente
    describe('refetch', () => {
      describe('run()', () => {
        it('viene chiamata una volta la fetch e run torna il risultato successful', async () => {
          const { successF, result } = await runSuccessOnce(1);
          expect(successF.mock.calls.length).toBe(1);
          expect(result).toEqual(right(1));
        });

        it('viene chiamata una volta una fetch che fallisce sempre e run ritorna il fallimento', async () => {
          const { failureF, result } = await runFailureOnce(1);
          expect(failureF.mock.calls.length).toBe(1);
          expect(result).toEqual(left('nope'));
        });

        it('dopo avere eseguito run con successo una volta, viene chiamata di nuovo run e la fetch esegue nuovamente', async () => {
          const { successF, result, query } = await runSuccessOnce(1);
          expect(successF.mock.calls.length).toBe(1);
          expect(result).toEqual(right(1));
          const result2 = await query.run(1).run();
          expect(successF.mock.calls.length).toBe(2);
          expect(result2).toEqual(right(1));
        });

        it('dopo avere eseguito run con fallimento una volta, viene chiamata di nuovo run e la fetch esegue nuovamente', async () => {
          const { failureF, result, query } = await runFailureOnce(1);
          expect(failureF.mock.calls.length).toBe(1);
          expect(result).toEqual(left('nope'));
          const result2 = await query.run(1).run();
          expect(failureF.mock.calls.length).toBe(2);
          expect(result2).toEqual(left('nope'));
        });
      });
    });
  });
});
