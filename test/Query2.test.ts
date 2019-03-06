import { query } from '../src/Query2';
import { identity } from 'fp-ts/lib/function';
import { right } from 'fp-ts/lib/Either';

describe('Query2', () => {
  describe('Functor', () => {
    it('map', async () => {
      const q = query.of<string, string, number>(2);
      const double = (n: number) => n * 2;
      const res = await q.map(double).run('foo');
      expect(res).toEqual(right(4));
    });

    it('Identity: F.map(fa, a => a) = fa', async () => {
      const q = query.of<number, string, boolean>(true);
      const [res1, res2] = await Promise.all([
        query.map(q, identity).run(0),
        q.run(0)
      ]);
      expect(res1).toEqual(res2);
    });

    it('Composition: F.map(fa, a => bc(ab(a))) = F.map(F.map(fa, ab), bc)', async () => {
      const q = query.of<string, string, number>(7);
      const double = (n: number) => n * 2;
      const add1 = (n: number) => n + 1;
      const [res1, res2] = await Promise.all([
        query.map(q, a => add1(double(a))).run('foo'),
        query.map(query.map(q, double), add1).run('foo')
      ]);
      expect(res1).toEqual(res2);
    });
  });
});
