import { taskEither, fromLeft } from 'fp-ts/lib/TaskEither';
import { queryShallow, compose } from '../src/Query';
import { refetch } from '../src/Strategy';
import { makeTestFetch } from './utils/testFetch';
import { right, left } from 'fp-ts/lib/Either';

describe('Compose', () => {
  describe('refetch', () => {
    describe('run()', () => {
      it('viene chiamata una volta la fetch di master e una volta la fetch di slave, e viene ritornato il risultato successful di slave', async () => {
        const master = makeTestFetch([(s: string) => taskEither.of(s.length)]);
        const slave = makeTestFetch([(n: number) => taskEither.of(n * 2)]);
        const composition = compose(
          queryShallow(master, refetch),
          queryShallow(slave, refetch)
        );
        const result = await composition.run('foo').run();
        master.assertExhausted();
        slave.assertExhausted();
        expect(result).toEqual(right(6));
      });

      it('viene chiamata una volta la fetch di master che fallisce sempre, NON viene chiamata la fetch di slave, e viene ritornato il fallimento di master', async () => {
        const master = makeTestFetch([
          (_: string) => fromLeft<string, number>('nope')
        ]);
        const slave = makeTestFetch<number, unknown, unknown>([]);
        const composition = compose(
          queryShallow(master, refetch),
          queryShallow(slave, refetch)
        );
        const result = await composition.run('foo').run();
        master.assertExhausted();
        slave.assertExhausted();
        expect(result).toEqual(left('nope'));
      });

      it('viene chiamata una volta la fetch di master che ha successo, viene chiamata una volta la fetch di slave che fallisce sempre, e viene ritornato il fallimento di slave', async () => {
        const master = makeTestFetch([(s: string) => taskEither.of(s.length)]);
        const slave = makeTestFetch([
          (_: number) => fromLeft<string, number>('nope')
        ]);
        const composition = compose(
          queryShallow(master, refetch),
          queryShallow(slave, refetch)
        );
        const result = await composition.run('foo').run();
        master.assertExhausted();
        slave.assertExhausted();
        expect(result).toEqual(left('nope'));
      });

      it(`
        dopo avere eseguito run con successo una volta,
        si fa run() nuovamente e viene chiamata una volta la fetch di master e una volta la fetch di slave,
        viene ritornato il risultato successful della seconda chiamata di slave
      `, async () => {
        const master = makeTestFetch([
          (s: string) => taskEither.of(s.length),
          (s: string) => taskEither.of(s.length)
        ]);
        const slave = makeTestFetch([
          (n: number) => taskEither.of(n * 2),
          (n: number) => taskEither.of(n / 2)
        ]);
        const composition = compose(
          queryShallow(master, refetch),
          queryShallow(slave, refetch)
        );
        await composition.run('fooo').run();
        const result = await composition.run('fooo').run();
        expect(result).toEqual(right(2));
        master.assertExhausted();
        slave.assertExhausted();
      });

      it(`
        dopo aver eseguito run con fallimento di master una volta,
        si fa run() nuovamente e viene chiamata una volta la fetch di master che fallisce sempre,
        NON viene chiamata la fetch di slave, e viene ritornato il secondo fallimento di master
      `, async () => {
        const master = makeTestFetch<string, string, unknown>([
          (_: string) => fromLeft('nope'),
          (_: string) => fromLeft('nope2')
        ]);
        const slave = makeTestFetch<unknown, unknown, unknown>([]);
        const composition = compose(
          queryShallow(master, refetch),
          queryShallow(slave, refetch)
        );
        await composition.run('foo').run();
        const result = await composition.run('foo').run();
        expect(result).toEqual(left('nope2'));
        master.assertExhausted();
        slave.assertExhausted();
      });

      it(`
        dopo aver eseguito run con fallimento di master una volta,
        si fa run() nuovamente e viene chiamata una volta la fetch di master che ha successo,
        viene chiamata la fetch di slave che fallisce sempre, e viene ritornato il fallimento di slave
      `, async () => {
        const master = makeTestFetch<string, string, number>([
          (_: string) => fromLeft('nope'),
          (s: string) => taskEither.of(s.length)
        ]);
        const slave = makeTestFetch([(n: number) => taskEither.of(n * 2)]);
        const composition = compose(
          queryShallow(master, refetch),
          queryShallow(slave, refetch)
        );
        await composition.run('foo').run();
        const result = await composition.run('foo').run();
        expect(result).toEqual(right(6));
        master.assertExhausted();
        slave.assertExhausted();
      });

      it(`
        dopo aver eseguito run con fallimento di slave una volta,
        si fa run() nuovamente e viene chiamata una volta la fetch di master che fallisce sempre,
        NON viene chiamata la fetch di slave, e viene ritornato il fallimento di master
      `, async () => {
        const master = makeTestFetch<string, string, number>([
          (s: string) => taskEither.of(s.length),
          (_: string) => fromLeft('nopeMaster')
        ]);
        const slave = makeTestFetch([(_: number) => fromLeft('nopeSlave')]);
        const composition = compose(
          queryShallow(master, refetch),
          queryShallow(slave, refetch)
        );
        await composition.run('foo').run();
        const result = await composition.run('foo').run();
        expect(result).toEqual(left('nopeMaster'));
        master.assertExhausted();
        slave.assertExhausted();
      });

      it(`
        dopo aver eseguito run con fallimento di slave una volta,
        si fa run() nuovamente e viene chiamata una volta la fetch di master che ha successo,
        viene chiamata la fetch di slave che fallisce sempre, e viene ritornato il secondo fallimento di slave
      `, async () => {
        const master = makeTestFetch<string, string, number>([
          (s: string) => taskEither.of(s.length),
          (s: string) => taskEither.of(s.length)
        ]);
        const slave = makeTestFetch([
          (_: number) => fromLeft('nope'),
          (_: number) => fromLeft('nope2')
        ]);
        const composition = compose(
          queryShallow(master, refetch),
          queryShallow(slave, refetch)
        );
        await composition.run('foo').run();
        const result = await composition.run('foo').run();
        expect(result).toEqual(left('nope2'));
        master.assertExhausted();
        slave.assertExhausted();
      });
    });
  });
});
