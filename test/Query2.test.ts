import { query, CachedQuery } from '../src/Query2';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { identity } from 'rxjs';
import { right } from 'fp-ts/lib/Either';
import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither';

describe('Query2', () => {
  describe('Functor', () => {
    it('Identity: F.map(fa, a => a) = fa', async () => {
      const v = (a: number) => taskEither.of<string, boolean>(a > 1);
      const q = new CachedQuery(new ReaderTaskEither(v));
      const values = await Promise.all([
        query.map(q, identity).run(0),
        q.run(0)
      ]);
      expect(values).toEqual([right(false), right(false)]);
    });

    it('Composition: F.map(fa, a => bc(ab(a))) = F.map(F.map(fa, ab), bc)', async () => {
      const v = (a: string) => taskEither.of<string, number>(a.length);
      const q = new CachedQuery(new ReaderTaskEither(v));
      const double = (n: number) => n * 2;
      const add1 = (n: number) => n + 1;
      const values = await Promise.all([
        query.map(q, a => add1(double(a))).run('foo'),
        query.map(query.map(q, double), add1).run('foo')
      ]);
      expect(values).toEqual([right(7), right(7)]);
    });
  });
});
