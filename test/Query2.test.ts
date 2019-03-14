import * as Q from '../src/Query2';
import { identity, Curried3, Function1 } from 'fp-ts/lib/function';
import { right } from 'fp-ts/lib/Either';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { setoidString, setoidNumber } from 'fp-ts/lib/Setoid';
import { sequenceT } from 'fp-ts/lib/Apply';

describe('Query2', () => {
  describe('Functor', () => {
    it('map', async () => {
      const q = Q.query.of<string, string, number>(2);
      const double = (n: number) => n * 2;
      const res = await q.map(double).run('foo');
      expect(res).toEqual(right(4));
    });

    it('Identity: F.map(fa, a => a) = fa', async () => {
      const q = Q.query.of<number, string, boolean>(true);
      const [res1, res2] = await Promise.all([
        Q.query.map(q, identity).run(0),
        q.run(0)
      ]);
      expect(res1).toEqual(res2);
    });

    it('Composition: F.map(fa, a => bc(ab(a))) = F.map(F.map(fa, ab), bc)', async () => {
      const q = Q.query.of<string, string, number>(7);
      const double = (n: number) => n * 2;
      const add1 = (n: number) => n + 1;
      const [res1, res2] = await Promise.all([
        Q.query.map(q, a => add1(double(a))).run('foo'),
        Q.query.map(Q.query.map(q, double), add1).run('foo')
      ]);
      expect(res1).toEqual(res2);
    });
  });

  describe('Apply', () => {
    it('ap', async () => {
      const f = (n: number) => n * 2;
      const result = await Q.query
        .of<string, string, number>(2)
        .ap(Q.query.of<string, string, (n: number) => number>(f))
        .run('');
      expect(result).toEqual(right(4));
    });

    it('Associative composition: F.ap(F.ap(F.map(fbc, bc => ab => a => bc(ab(a))), fab), fa) = F.ap(fbc, F.ap(fab, fa))', async () => {
      type AB = Function1<number, string>;
      const ab: AB = String;
      type BC = Function1<string, number>;
      const bc: BC = s => s.length;
      const f: Curried3<BC, AB, number, number> = bc => ab => a => bc(ab(a));
      const fa = Q.query.of<string, string, number>(1);
      const fab = Q.query.of<string, string, AB>(ab);
      const fbc = Q.query.of<string, string, BC>(bc);
      const [res1, res2] = await Promise.all([
        Q.query.ap(Q.query.ap(Q.query.map(fbc, f), fab), fa).run(''),
        Q.query.ap(fbc, Q.query.ap(fab, fa)).run('')
      ]);
      expect(res1).toEqual(res2);
    });
  });

  describe('Applicative', () => {
    it('of', async () => {
      const q = Q.query.of<string, void, number>(1);
      const p = await q.run('');
      expect(p).toEqual(right(1));
    });

    it('Identity: A.ap(A.of(a => a), fa) = fa', async () => {
      const fa = Q.query.of<string, string, number>(1);
      type AA = (n: number) => number;
      const faa = Q.query.of<string, string, AA>(identity);
      const [res1, res2] = await Promise.all([
        Q.query.ap(faa, fa).run(''),
        fa.run('')
      ]);
      expect(res1).toEqual(res2);
    });

    it('Homomorphism: A.ap(A.of(ab), A.of(a)) = A.of(ab(a))', async () => {
      const ab: Function1<string, number> = s => s.length;
      const fab = Q.query.of<string, string, Function1<string, number>>(ab);
      const fa = Q.query.of<string, string, string>('foo');
      const [res1, res2] = await Promise.all([
        Q.query.ap(fab, fa).run(''),
        Q.query.of<string, string, number>(ab('foo')).run('')
      ]);
      expect(res1).toEqual(res2);
    });

    it('Interchange: A.ap(fab, A.of(a)) = A.ap(A.of(ab => ab(a)), fab)', async () => {
      type AB = Function1<string, number>;
      const ab: AB = s => s.length;
      const fab = Q.query.of<string, string, Function1<string, number>>(ab);
      const a: string = 'foo';
      const fa = Q.query.of<string, string, string>(a);
      const [res1, res2] = await Promise.all([
        Q.query.ap(fab, fa).run(''),
        Q.query
          .ap(
            Q.query.of<string, string, Function1<AB, number>>((ab: AB) =>
              ab(a)
            ),
            fab
          )
          .run('')
      ]);
      expect(res1).toEqual(res2);
    });
  });

  describe('CachedQuery', () => {
    it('should cache values indefinitely', async () => {
      const aObj = {
        a: (s: string) => taskEither.of<string, number>(s.length)
      };
      const aSpy = jest.spyOn(aObj, 'a');
      const fa = Q.fromFetch(setoidString)(aObj.a);
      const res1 = await fa.run('foo');
      expect(res1).toEqual(right(3));
      expect(aSpy.mock.calls.length).toBe(1);
      const res2 = await fa.run('foo');
      expect(res2).toEqual(right(3));
      expect(aSpy.mock.calls.length).toBe(1);
    });
  });

  describe('CompositionQuery', () => {
    it('should cache values indefinitely', async () => {
      const aObj = { a: (s: string) => taskEither.of(s.length) };
      const bObj = { b: (n: number) => taskEither.of(n * 2) };
      const aSpy = jest.spyOn(aObj, 'a');
      const bSpy = jest.spyOn(bObj, 'b');
      const fa = Q.fromFetch(setoidString)(aObj.a);
      const composition = fa.compose(
        bObj.b,
        setoidNumber
      );
      const res1 = await composition.run('foo');
      expect(res1).toEqual(right(6));
      expect(aSpy.mock.calls.length).toBe(1);
      expect(bSpy.mock.calls.length).toBe(1);
      const res2 = await composition.run('foo');
      expect(res2).toEqual(right(6));
      expect(aSpy.mock.calls.length).toBe(1);
      expect(bSpy.mock.calls.length).toBe(1);
    });
  });

  describe('ProductQuery', () => {
    it('should cache values indefinitely', async () => {
      const aObj = {
        a: (s: string) => taskEither.of<string, number>(s.length)
      };
      const bObj = {
        b: (s: string) => taskEither.of<string, string>(s + s)
      };
      const aSpy = jest.spyOn(aObj, 'a');
      const bSpy = jest.spyOn(bObj, 'b');
      const fa = Q.fromFetch(setoidString)(aObj.a);
      const fb = Q.fromFetch(setoidString)(bObj.b);
      const product = sequenceT(Q.query)(fa, fb);
      const res1 = await product.run('foo');
      expect(res1).toEqual(right([3, 'foofoo']));
      expect(aSpy.mock.calls.length).toBe(1);
      expect(bSpy.mock.calls.length).toBe(1);
      const res2 = await product.run('foo');
      expect(res2).toEqual(right([3, 'foofoo']));
      expect(aSpy.mock.calls.length).toBe(1);
      expect(bSpy.mock.calls.length).toBe(1);
    });
  });
});
