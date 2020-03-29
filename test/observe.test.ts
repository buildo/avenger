import * as TE from 'fp-ts/lib/TaskEither';
import { take, toArray } from 'rxjs/operators';
import * as Eq from 'fp-ts/lib/Eq';
import * as S from '../src/Strategy';
import * as CV from '../src/CacheValue';
import * as QR from '../src/QueryResult';
import { query, compose, product } from '../src/Query';
import { observe } from '../src/observe';
import { invalidate } from '../src/invalidate';

const makeQuery = (f: jest.Mock, increasingResult?: boolean) => {
  let i = 0;
  return query((a: number) => {
    f();
    const result = increasingResult ? a + i : a;
    i++;
    return TE.taskEither.of<string, number>(result);
  })(S.available(Eq.eqNumber, CV.getEq(Eq.eqString, Eq.eqNumber)));
};

const wait = (timeout: number) =>
  new Promise(resolve => setTimeout(() => resolve(false), timeout));

describe('observe', () => {
  it('does something', async () => {
    const a = (input: number) => TE.taskEither.of(input);
    const cachedA = query(a)(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    requestAnimationFrame(() => cachedA.run(1)());
    const results = await observe(
      cachedA,
      1,
      QR.getEq(Eq.eqStrict, Eq.eqStrict)
    )
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: 1, loading: false }
    ]);
  });

  it('caches indefinitely with strategy=available', async () => {
    const a = (input: number) => TE.taskEither.of(input);
    const cachedA = query(a)(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    requestAnimationFrame(() => cachedA.run(1)());
    const results1 = await observe(
      cachedA,
      1,
      QR.getEq(Eq.eqStrict, Eq.eqStrict)
    )
      .pipe(take(2), toArray())
      .toPromise();
    expect(results1).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: 1, loading: false }
    ]);
    requestAnimationFrame(() => cachedA.run(1)());
    const results2 = await observe(
      cachedA,
      1,
      QR.getEq(Eq.eqStrict, Eq.eqStrict)
    )
      .pipe(take(1), toArray())
      .toPromise();
    expect(results2).toEqual([{ _tag: 'Success', success: 1, loading: false }]);
  });

  it('new observers get the latest available result', async () => {
    const a = (input: number) => TE.taskEither.of(input);
    const cachedA = query(a)(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    requestAnimationFrame(() => cachedA.run(1)());
    const results1 = await observe(
      cachedA,
      1,
      QR.getEq(Eq.eqStrict, Eq.eqStrict)
    )
      .pipe(take(2), toArray())
      .toPromise();
    expect(results1).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: 1, loading: false }
    ]);
    const results2 = await observe(
      cachedA,
      1,
      QR.getEq(Eq.eqStrict, Eq.eqStrict)
    )
      .pipe(take(1), toArray())
      .toPromise();
    expect(results2).toEqual([{ _tag: 'Success', success: 1, loading: false }]);
  });

  it('should reuse the same pending (primitive inputs)', async () => {
    const aSpy = jest.fn((input: number) => TE.taskEither.of(input));
    const cachedA = query(aSpy)(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    requestAnimationFrame(() => cachedA.run(1)());
    requestAnimationFrame(() => cachedA.run(1)());
    const o1 = observe(cachedA, 1, QR.getEq(Eq.eqStrict, Eq.eqStrict))
      .pipe(take(2), toArray())
      .toPromise();
    const o2 = observe(cachedA, 1, QR.getEq(Eq.eqStrict, Eq.eqStrict))
      .pipe(take(2), toArray())
      .toPromise();
    const [results1, results2] = await Promise.all([o1, o2]);
    expect(results1).toEqual(results2);
    expect(aSpy.mock.calls.length).toBe(1);
  });

  it('should reuse the same pending (non-primitive inputs)', async () => {
    const fooEq = Eq.getStructEq({ foo: Eq.eqString });
    const aSpy = jest.fn((input: { foo: string }) => TE.taskEither.of(input));
    const cachedA = query(aSpy)(
      S.available(fooEq, CV.getEq(Eq.eqStrict, fooEq))
    );
    const input1 = { foo: 'bar' };
    const input2 = { foo: 'bar' };
    requestAnimationFrame(() => cachedA.run(input1)());
    requestAnimationFrame(() => cachedA.run(input2)());
    const o1 = observe(cachedA, input1, QR.getEq(Eq.eqStrict, Eq.eqStrict))
      .pipe(take(2), toArray())
      .toPromise();
    const o2 = observe(cachedA, input2, QR.getEq(Eq.eqStrict, Eq.eqStrict))
      .pipe(take(2), toArray())
      .toPromise();
    const [results1, results2] = await Promise.all([o1, o2]);
    expect(results1).toEqual(results2);
    expect(aSpy.mock.calls.length).toBe(1);
  });

  it('should notify on failures', async () => {
    const a = query((_: string) => TE.left<string, unknown>('nope'))(
      S.available(Eq.eqString, CV.getEq(Eq.eqString, Eq.eqStrict))
    );
    requestAnimationFrame(() => a.run('foo')());
    const results = await observe(a, 'foo', QR.getEq(Eq.eqStrict, Eq.eqStrict))
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Failure', failure: 'nope', loading: false }
    ]);
  });

  it('compose', async () => {
    const master = query((s: string) => TE.taskEither.of(s.length))(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const slave = query((n: number) => TE.taskEither.of(n * 2))(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const composition = compose(master, slave);
    requestAnimationFrame(() => composition.run('foo')());
    const results = await observe(
      composition,
      'foo',
      QR.getEq(Eq.eqStrict, Eq.eqStrict)
    )
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: 6, loading: false }
    ]);
  });

  it("compose - master's observer is notified when composition is run", async () => {
    const master = query((s: string) => TE.taskEither.of(s.length))(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const slave = query((n: number) => TE.taskEither.of(n * 2))(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const composition = compose(master, slave);
    requestAnimationFrame(() => {
      observe(
        composition,
        'foo',
        QR.getEq(Eq.eqStrict, Eq.eqStrict)
      ).subscribe();
      composition.run('foo')();
    });
    const results = await observe(
      master,
      'foo',
      QR.getEq(Eq.eqStrict, Eq.eqStrict)
    )
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: 3, loading: false }
    ]);
  });

  it("compose - slave's observer is notified when composition is run", async () => {
    const master = query((s: string) => TE.taskEither.of(s.length))(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const slave = query((n: number) => TE.taskEither.of(n * 2))(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const composition = compose(master, slave);
    requestAnimationFrame(() => composition.run('foo')());
    const results = await observe(slave, 3, QR.getEq(Eq.eqStrict, Eq.eqStrict))
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: 6, loading: false }
    ]);
  });

  it("compose - composition's observer is notified when master is run", async () => {
    const master = query((s: string) => TE.taskEither.of(s.length))(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const slave = query((n: number) => TE.taskEither.of(n * 2))(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const composition = compose(master, slave);
    requestAnimationFrame(() => master.run('foo')());
    const results = await observe(
      composition,
      'foo',
      QR.getEq(Eq.eqStrict, Eq.eqStrict)
    )
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: 6, loading: false }
    ]);
  });

  it("compose - composition's observer is notified with failure on master failure", async () => {
    const master = query((_: string) => TE.left<string, number>('nope'))(
      S.available(Eq.eqString, CV.getEq(Eq.eqString, Eq.eqNumber))
    );
    const slave = query((n: number) => TE.taskEither.of(n * 2))(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const composition = compose(master, slave);
    requestAnimationFrame(() => master.run('foo')());
    const results = await observe(
      composition,
      'foo',
      QR.getEq(Eq.eqStrict, Eq.eqStrict)
    )
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Failure', failure: 'nope', loading: false }
    ]);
  });

  it("compose - composition's observer is notified with failure on slave failure", async () => {
    const master = query((s: string) => TE.taskEither.of(s.length))(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const slave = query((_: number) => TE.left<string, number>('nope'))(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqString, Eq.eqNumber))
    );
    const composition = compose(master, slave);
    requestAnimationFrame(() => slave.run(3)());
    const results = await observe(
      composition,
      'foo',
      QR.getEq(Eq.eqStrict, Eq.eqStrict)
    )
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Failure', failure: 'nope', loading: false }
    ]);
  });

  it('product', async () => {
    const f1 = query((s: string) => TE.taskEither.of(s.length))(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const f2 = query((n: number) => TE.taskEither.of(n * 2))(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const p = product({ f1, f2 });
    requestAnimationFrame(() => p.run({ f1: 'foo', f2: 2 })());
    const results = await observe(
      p,
      { f1: 'foo', f2: 2 },
      QR.getEq(Eq.eqStrict, S.eqShallow)
    )
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: { f1: 3, f2: 4 }, loading: false }
    ]);
  });

  it('product - f<n> observer is notified when product is run', async () => {
    const f1 = query((s: string) => TE.taskEither.of(s.length))(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const f2 = query((n: number) => TE.taskEither.of(n * 2))(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const p = product({ f1, f2 });
    requestAnimationFrame(() => p.run({ f1: 'foo', f2: 2 })());
    const results = await observe(f1, 'foo', QR.getEq(Eq.eqStrict, S.eqShallow))
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: 3, loading: false }
    ]);
  });

  it('product - product observer is notified when f<n> is run', async () => {
    const f1 = query((s: string) => TE.taskEither.of(s.length))(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const f2 = query((n: number) => TE.taskEither.of(n * 2))(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const p = product({ f1, f2 });
    requestAnimationFrame(() => f1.run('foo')());
    const results = await observe(
      p,
      { f1: 'foo', f2: 1 },
      QR.getEq(Eq.eqStrict, S.eqShallow)
    )
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: { f1: 3, f2: 2 }, loading: false }
    ]);
  });

  it('product - product observer is notified with failure on f<n> failure', async () => {
    const f1 = query((s: string) => TE.taskEither.of(s.length))(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const f2 = query((_: number) => TE.left<string, number>('nope'))(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqString, Eq.eqNumber))
    );
    const p = product({ f1, f2 });
    requestAnimationFrame(() => f1.run('foo')());
    const results = await observe(
      p,
      { f1: 'foo', f2: 1 },
      QR.getEq(Eq.eqStrict, S.eqShallow)
    )
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Failure', failure: 'nope', loading: false }
    ]);
  });

  it('should handle passing empty input in case of void input queries', async () => {
    const cachedA = product({
      a: query(() => TE.taskEither.of(3))(
        S.available(Eq.eqStrict as any, CV.getEq(Eq.eqStrict, Eq.eqNumber))
      )
    });
    requestAnimationFrame(() => cachedA.run()());
    const results = await observe(
      cachedA,
      undefined,
      QR.getEq(Eq.eqStrict, Eq.eqStrict)
    )
      .pipe(take(2), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: { a: 3 }, loading: false }
    ]);
  });

  it('compose - composition slave should not re-fetch if master result is the same according to its cacheValue Eq', async () => {
    const fmaster = jest.fn(() => TE.taskEither.of<void, string>('foo'));
    const fslave = jest.fn((input: string) =>
      TE.taskEither.of<void, number>(input.length)
    );
    const master = query(fmaster)(
      S.available(Eq.eqStrict, CV.getEq(Eq.eqStrict, Eq.eqString))
    );
    const slave = query(fslave)(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const composition = compose(master, slave);
    requestAnimationFrame(() => master.run()());
    setTimeout(() => master.invalidate()(), 10);
    const results = await observe(
      composition,
      undefined,
      Eq.fromEquals(() => false)
    )
      .pipe(take(4), toArray())
      .toPromise();
    expect(results).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', loading: false, success: 3 },
      { _tag: 'Loading' },
      { _tag: 'Success', loading: false, success: 3 }
    ]);
    expect(fmaster.mock.calls.length).toBe(2);
    expect(fslave.mock.calls.length).toBe(1);
  });

  it('when a query is observed, it is not yet run', async () => {
    const queryMock = jest.fn(() => {});
    const a = makeQuery(queryMock);
    observe(a, 1, Eq.eqStrict);
    await wait(10);

    expect(queryMock.mock.calls.length).toBe(0);
  });

  it('when someone subscribe to a query, the query is run', async () => {
    const queryMock = jest.fn(() => {});
    const a = makeQuery(queryMock);
    observe(a, 1, Eq.eqStrict).subscribe(() => {});
    await wait(10);

    expect(queryMock.mock.calls.length).toBe(1);
  });

  it('when you compose two queries, none of them is run before there is a subscription', async () => {
    const masterMock = jest.fn(() => {});
    const slaveMock = jest.fn(() => {});
    const a = makeQuery(masterMock);
    const b = makeQuery(slaveMock);
    observe(compose(a, b), 1, Eq.eqStrict);
    await wait(10);

    expect(masterMock.mock.calls.length).toBe(0);
    expect(slaveMock.mock.calls.length).toBe(0);
  });

  it('when there is a subscription to a composed query, both queries in the composition are run', async () => {
    const masterMock = jest.fn(() => {});
    const slaveMock = jest.fn(() => {});
    const a = makeQuery(masterMock);
    const b = makeQuery(slaveMock);
    observe(compose(a, b), 1, Eq.eqStrict).subscribe(a => a);
    await wait(10);

    expect(masterMock.mock.calls.length).toBe(1);
    expect(slaveMock.mock.calls.length).toBe(1);
  });

  it('in a composed query, when the master is invalidated but returns the same value as before, the slave is NOT re-run and the update is dispatched', async () => {
    const masterMock = jest.fn(() => {});
    const slaveMock = jest.fn(() => {});
    const eventDispatchMock = jest.fn(() => {});
    const a = makeQuery(masterMock);
    const b = makeQuery(slaveMock);
    observe(compose(a, b), 1, Eq.eqStrict).subscribe(eventDispatchMock);
    await wait(10);
    invalidate({ a }, { a: 1 })();
    await wait(10);

    expect(masterMock.mock.calls.length).toBe(2);
    expect(eventDispatchMock.mock.calls.length).toBe(4);
    expect(slaveMock.mock.calls.length).toBe(1);
  });

  it('in a composed query, when the master is invalidated and returns a different value, the slave is re-run and the update is dispatched', async () => {
    const masterMock = jest.fn(() => {});
    const slaveMock = jest.fn(() => {});
    const eventDispatchMock = jest.fn(() => {});
    const a = makeQuery(masterMock, true);
    const b = makeQuery(slaveMock, true);
    observe(compose(a, b), 1, Eq.eqStrict).subscribe(eventDispatchMock);
    await wait(10);
    invalidate({ a }, { a: 1 })();
    await wait(10);

    expect(masterMock.mock.calls.length).toBe(2);
    expect(eventDispatchMock.mock.calls.length).toBe(4);
    expect(slaveMock.mock.calls.length).toBe(2);
  });

  it('in a composed query, when the slave is invalidated the master is not re-run and the update is dispatched', async () => {
    const masterMock = jest.fn(() => {});
    const slaveMock = jest.fn(() => {});
    const eventDispatchMock = jest.fn(() => {});
    const a = makeQuery(masterMock);
    const b = makeQuery(slaveMock);
    observe(compose(a, b), 1, Eq.eqStrict).subscribe(eventDispatchMock);
    await wait(10);
    invalidate({ b }, { b: 1 })();
    await wait(10);

    expect(masterMock.mock.calls.length).toBe(1);
    expect(eventDispatchMock.mock.calls.length).toBe(4);
    expect(slaveMock.mock.calls.length).toBe(2);
  });
});
