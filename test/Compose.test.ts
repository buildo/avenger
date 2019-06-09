import { TaskEither } from 'fp-ts/lib/TaskEither';
import { queryShallow, StrategyBuilder, compose } from '../src/Query';
import { refetch } from '../src/Strategy';
import { StatefulFetch } from './utils/StatefulFetch';

async function runQueryShallow<A>(
  _masterFetch: () => TaskEither<string, string>,
  _slaveFetch: () => TaskEither<string, string>,
  masterStrategy: StrategyBuilder<A, string, string>,
  slaveStrategy: StrategyBuilder<string, string, string>,
  input: A
) {
  const masterFetch = jest.fn(_masterFetch);
  const slaveFetch = jest.fn(_slaveFetch);
  const query = compose(
    queryShallow(masterFetch, masterStrategy),
    queryShallow(slaveFetch, slaveStrategy)
  );
  const result = await query.run(input).run();
  return { masterFetch, slaveFetch, result, query };
}

// - compose
//   - refetch
//     - run()
//   - available
//     - run()
//       - viene chiamata una volta la fetch di master e una volta la fetch di slave, e viene ritornato il risultato successful di slave
//       - viene chiamata una volta la fetch di master che fallisce sempre, NON viene chiamata la fetch di slave, e viene ritornato il fallimento di master
//       - viene chiamata una volta la fetch di master che ha success, viene chiamata una volta la fetch di slave che fallisce sempre, e viene ritornato il fallimento di slave
//       - dopo avere eseguito run con successo una volta,
//         si fa run() nuovamente e NON viene chiamata la fetch di master e NON viene chiamata la fetch di slave, e viene ritornato il precedente risultato successful di slave
//       - dopo aver eseguito run con fallimento di master una volta,
//         si fa run() nuovamente e viene chiamata una volta la fetch di master che fallisce sempre,
//         NON viene chiamata la fetch di slave, e viene ritornato il fallimento di master
//       - dopo aver eseguito run con fallimento di master una volta,
//         si fa run() nuovamente e viene chiamata una volta la fetch di master che ha successo,
//         viene chiamata la fetch di slave che fallisce sempre, e viene ritornato il fallimento di slave
//       - dopo aver eseguito run con fallimento di slave una volta,
//         si fa run() nuovamente e NON viene chiamata la fetch di master,
//         viene chiamata la fetch di slave, e viene ritornato il success di slave
//       - dopo aver eseguito run con fallimento di slave una volta,
//         si fa run() nuovamente e NON viene chiamata la fetch di master,
//         viene chiamata la fetch di slave che fallisce sempre, e viene ritornato il fallimento di slave

describe('Compose', () => {
  describe('refetch', () => {
    describe('run()', () => {
      it('viene chiamata una volta la fetch di master e una volta la fetch di slave, e viene ritornato il risultato successful di slave', async () => {
        const _masterFetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysTheSame'
        }).fetch;
        const _slaveFetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysTheSame',
          resultTag: 'slaveResult'
        }).fetch;
        const { masterFetch, slaveFetch, result } = await runQueryShallow(
          _masterFetch,
          _slaveFetch,
          refetch,
          refetch,
          1
        );
        expect(masterFetch.mock.calls.length).toBe(1);
        expect(slaveFetch.mock.calls.length).toBe(1);
        expect(result.getOrElse('').startsWith('slaveResult')).toBe(true);
      });

      it('viene chiamata una volta la fetch di master che fallisce sempre, NON viene chiamata la fetch di slave, e viene ritornato il fallimento di master', async () => {
        const _masterFetch = new StatefulFetch({
          order: 'alwaysFailure',
          resultType: 'alwaysTheSame',
          resultTag: 'masterFail'
        }).fetch;
        const _slaveFetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysTheSame'
        }).fetch;
        const { masterFetch, slaveFetch, result } = await runQueryShallow(
          _masterFetch,
          _slaveFetch,
          refetch,
          refetch,
          1
        );
        expect(masterFetch.mock.calls.length).toBe(1);
        expect(slaveFetch.mock.calls.length).toBe(0);
        expect(
          result
            .swap()
            .getOrElse('')
            .startsWith('masterFail')
        ).toBe(true);
      });

      it('viene chiamata una volta la fetch di master che ha successo, viene chiamata una volta la fetch di slave che fallisce sempre, e viene ritornato il fallimento di slave', async () => {
        const _masterFetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysTheSame'
        }).fetch;
        const _slaveFetch = new StatefulFetch({
          order: 'alwaysFailure',
          resultType: 'alwaysTheSame',
          resultTag: 'slaveFail'
        }).fetch;
        const { masterFetch, slaveFetch, result } = await runQueryShallow(
          _masterFetch,
          _slaveFetch,
          refetch,
          refetch,
          1
        );
        expect(masterFetch.mock.calls.length).toBe(1);
        expect(slaveFetch.mock.calls.length).toBe(1);
        expect(
          result
            .swap()
            .getOrElse('')
            .startsWith('slaveFail')
        ).toBe(true);
      });

      it(`
        dopo avere eseguito run con successo una volta,
        si fa run() nuovamente e viene chiamata una volta la fetch di master e una volta la fetch di slave,
        viene ritornato il risultato successful della seconda chiamata di slave
      `, async () => {
        const _masterFetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysTheSame'
        }).fetch;
        const _slaveFetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysDifferent',
          resultTag: 'slaveSuccess'
        }).fetch;
        const { masterFetch, slaveFetch, query } = await runQueryShallow(
          _masterFetch,
          _slaveFetch,
          refetch,
          refetch,
          1
        );
        const result2 = await query.run(1).run();
        expect(masterFetch.mock.calls.length).toBe(2);
        expect(slaveFetch.mock.calls.length).toBe(2);
        expect(result2.getOrElse('').startsWith('slaveSuccess2')).toBe(true);
      });

      it(`
        dopo aver eseguito run con fallimento di master una volta,
        si fa run() nuovamente e viene chiamata una volta la fetch di master che fallisce sempre,
        NON viene chiamata la fetch di slave, e viene ritornato il secondo fallimento di master
      `, async () => {
        const _masterFetch = new StatefulFetch({
          order: 'alwaysFailure',
          resultType: 'alwaysTheSame',
          resultTag: 'masterFail'
        }).fetch;
        const _slaveFetch = new StatefulFetch({
          order: 'alwaysSuccess',
          resultType: 'alwaysDifferent'
        }).fetch;
        const { masterFetch, slaveFetch, query } = await runQueryShallow(
          _masterFetch,
          _slaveFetch,
          refetch,
          refetch,
          1
        );
        const result2 = await query.run(1).run();
        expect(masterFetch.mock.calls.length).toBe(2);
        expect(slaveFetch.mock.calls.length).toBe(0);
        expect(
          result2
            .swap()
            .getOrElse('')
            .startsWith('masterFail2')
        ).toBe(true);
      });

      it(`
        dopo aver eseguito run con fallimento di master una volta,
        si fa run() nuovamente e viene chiamata una volta la fetch di master che ha successo,
        viene chiamata la fetch di slave che fallisce sempre, e viene ritornato il fallimento di slave
      `, async () => {
        const _masterFetch = new StatefulFetch({
          order: 'failureFirst',
          resultType: 'alwaysTheSame',
          resultTag: 'masterFail'
        }).fetch;
        const _slaveFetch = new StatefulFetch({
          order: 'alwaysFailure',
          resultType: 'alwaysDifferent',
          resultTag: 'slaveFail'
        }).fetch;
        const { masterFetch, slaveFetch, query } = await runQueryShallow(
          _masterFetch,
          _slaveFetch,
          refetch,
          refetch,
          1
        );
        const result2 = await query.run(1).run();
        expect(masterFetch.mock.calls.length).toBe(2);
        expect(slaveFetch.mock.calls.length).toBe(1);
        expect(
          result2
            .swap()
            .getOrElse('')
            .startsWith('slaveFail')
        ).toBe(true);
      });

      //       -
      //
      //       -
      //
      //
      //       -
      //
      //
      //       - dopo aver eseguito run con fallimento di slave una volta,
      //         si fa run() nuovamente e viene chiamata una volta la fetch di master che fallisce sempre,
      //         NON viene chiamata la fetch di slave, e viene ritornato il fallimento di master
      //       - dopo aver eseguito run con fallimento di slave una volta,
      //         si fa run() nuovamente e viene chiamata una volta la fetch di master che ha successo,
      //         viene chiamata la fetch di slave che fallisce sempre, e viene ritornato il fallimento di slave
    });
  });
});
