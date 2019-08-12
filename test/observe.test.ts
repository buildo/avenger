import { taskEither, fromLeft } from 'fp-ts/lib/TaskEither';
import { take, toArray } from 'rxjs/operators';
import {
  getStructSetoid,
  setoidString,
  setoidNumber,
  fromEquals
} from 'fp-ts/lib/Setoid';
import { available, setoidStrict, setoidShallow } from '../src/Strategy';
import { getSetoid as getCacheValueSetoid, getSetoid } from '../src/CacheValue';
import { getSetoid as getQueryResultSetoid } from '../src/QueryResult';
import { query, compose, product } from '../src/Query';
import { observe } from '../src/observe';
import { invalidate } from '../src/invalidate';

const makeQuery = (f: jest.Mock, increasingResult?: boolean) => {
  let i = 0;
  return query((a: number) => {
    f();
    const result = increasingResult ? a + i : a;
    i++;
    return taskEither.of<string, number>(result);
  })(available(setoidNumber, getCacheValueSetoid(setoidString, setoidNumber)));
};

const wait = (timeout: number) =>
  new Promise(resolve => setTimeout(() => resolve(false), timeout));

describe('observe', () => {
  it('does something', async () => {
    const a = (input: number) => taskEither.of(input);
    const cachedA = query(a)(
      available(setoidNumber, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    requestAnimationFrame(() => cachedA.run(1).run());
    const results = await observe(
      cachedA,
      1,
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 1, loading: false }
    ]);
  });

  it('caches indefinitely with strategy=available', async () => {
    const a = (input: number) => taskEither.of(input);
    const cachedA = query(a)(
      available(setoidNumber, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    requestAnimationFrame(() => cachedA.run(1).run());
    const results1 = await observe(
      cachedA,
      1,
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results1).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 1, loading: false }
    ]);
    requestAnimationFrame(() => cachedA.run(1).run());
    const results2 = await observe(
      cachedA,
      1,
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(1),
        toArray()
      )
      .toPromise();
    expect(results2).toEqual([{ type: 'Success', value: 1, loading: false }]);
  });

  it('new observers get the latest available result', async () => {
    const a = (input: number) => taskEither.of(input);
    const cachedA = query(a)(
      available(setoidNumber, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    requestAnimationFrame(() => cachedA.run(1).run());
    const results1 = await observe(
      cachedA,
      1,
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results1).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 1, loading: false }
    ]);
    const results2 = await observe(
      cachedA,
      1,
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(1),
        toArray()
      )
      .toPromise();
    expect(results2).toEqual([{ type: 'Success', value: 1, loading: false }]);
  });

  it('should reuse the same pending (primitive inputs)', async () => {
    const aSpy = jest.fn((input: number) => taskEither.of(input));
    const cachedA = query(aSpy)(
      available(setoidNumber, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    requestAnimationFrame(() => cachedA.run(1).run());
    requestAnimationFrame(() => cachedA.run(1).run());
    const o1 = observe(
      cachedA,
      1,
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    const o2 = observe(
      cachedA,
      1,
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    const [results1, results2] = await Promise.all([o1, o2]);
    expect(results1).toEqual(results2);
    expect(aSpy.mock.calls.length).toBe(1);
  });

  it('should reuse the same pending (non-primitive inputs)', async () => {
    const fooSetoid = getStructSetoid({ foo: setoidString });
    const aSpy = jest.fn((input: { foo: string }) => taskEither.of(input));
    const cachedA = query(aSpy)(
      available(fooSetoid, getCacheValueSetoid(setoidStrict, fooSetoid))
    );
    const input1 = { foo: 'bar' };
    const input2 = { foo: 'bar' };
    requestAnimationFrame(() => cachedA.run(input1).run());
    requestAnimationFrame(() => cachedA.run(input2).run());
    const o1 = observe(
      cachedA,
      input1,
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    const o2 = observe(
      cachedA,
      input2,
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    const [results1, results2] = await Promise.all([o1, o2]);
    expect(results1).toEqual(results2);
    expect(aSpy.mock.calls.length).toBe(1);
  });

  it('should notify on failures', async () => {
    const a = query((_: string) => fromLeft('nope'))(
      available(setoidString, getCacheValueSetoid(setoidString, setoidStrict))
    );
    requestAnimationFrame(() => a.run('foo').run());
    const results = await observe(
      a,
      'foo',
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Failure', value: 'nope', loading: false }
    ]);
  });

  it('compose', async () => {
    const master = query((s: string) => taskEither.of(s.length))(
      available(setoidString, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const slave = query((n: number) => taskEither.of(n * 2))(
      available(setoidNumber, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const composition = compose(
      master,
      slave
    );
    requestAnimationFrame(() => composition.run('foo').run());
    const results = await observe(
      composition,
      'foo',
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 6, loading: false }
    ]);
  });

  it("compose - master's observer is notified when composition is run", async () => {
    const master = query((s: string) => taskEither.of(s.length))(
      available(setoidString, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const slave = query((n: number) => taskEither.of(n * 2))(
      available(setoidNumber, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const composition = compose(
      master,
      slave
    );
    requestAnimationFrame(() => {
      observe(
        composition,
        'foo',
        getQueryResultSetoid(setoidStrict, setoidStrict)
      ).subscribe();
      composition.run('foo').run();
    });
    const results = await observe(
      master,
      'foo',
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 3, loading: false }
    ]);
  });

  it("compose - slave's observer is notified when composition is run", async () => {
    const master = query((s: string) => taskEither.of(s.length))(
      available(setoidString, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const slave = query((n: number) => taskEither.of(n * 2))(
      available(setoidNumber, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const composition = compose(
      master,
      slave
    );
    requestAnimationFrame(() => composition.run('foo').run());
    const results = await observe(
      slave,
      3,
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 6, loading: false }
    ]);
  });

  it("compose - composition's observer is notified when master is run", async () => {
    const master = query((s: string) => taskEither.of(s.length))(
      available(setoidString, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const slave = query((n: number) => taskEither.of(n * 2))(
      available(setoidNumber, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const composition = compose(
      master,
      slave
    );
    requestAnimationFrame(() => master.run('foo').run());
    const results = await observe(
      composition,
      'foo',
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 6, loading: false }
    ]);
  });

  it("compose - composition's observer is notified with failure on master failure", async () => {
    const master = query((_: string) => fromLeft<string, number>('nope'))(
      available(setoidString, getCacheValueSetoid(setoidString, setoidNumber))
    );
    const slave = query((n: number) => taskEither.of(n * 2))(
      available(setoidNumber, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const composition = compose(
      master,
      slave
    );
    requestAnimationFrame(() => master.run('foo').run());
    const results = await observe(
      composition,
      'foo',
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Failure', value: 'nope', loading: false }
    ]);
  });

  it("compose - composition's observer is notified with failure on slave failure", async () => {
    const master = query((s: string) => taskEither.of(s.length))(
      available(setoidString, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const slave = query((_: number) => fromLeft<string, number>('nope'))(
      available(setoidNumber, getCacheValueSetoid(setoidString, setoidNumber))
    );
    const composition = compose(
      master,
      slave
    );
    requestAnimationFrame(() => slave.run(3).run());
    const results = await observe(
      composition,
      'foo',
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Failure', value: 'nope', loading: false }
    ]);
  });

  it('product', async () => {
    const f1 = query((s: string) => taskEither.of(s.length))(
      available(setoidString, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const f2 = query((n: number) => taskEither.of(n * 2))(
      available(setoidNumber, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const p = product({ f1, f2 });
    requestAnimationFrame(() => p.run({ f1: 'foo', f2: 2 }).run());
    const results = await observe(
      p,
      { f1: 'foo', f2: 2 },
      getQueryResultSetoid(setoidStrict, setoidShallow)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: { f1: 3, f2: 4 }, loading: false }
    ]);
  });

  it('product - f<n> observer is notified when product is run', async () => {
    const f1 = query((s: string) => taskEither.of(s.length))(
      available(setoidString, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const f2 = query((n: number) => taskEither.of(n * 2))(
      available(setoidNumber, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const p = product({ f1, f2 });
    requestAnimationFrame(() => p.run({ f1: 'foo', f2: 2 }).run());
    const results = await observe(
      f1,
      'foo',
      getQueryResultSetoid(setoidStrict, setoidShallow)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 3, loading: false }
    ]);
  });

  it('product - product observer is notified when f<n> is run', async () => {
    const f1 = query((s: string) => taskEither.of(s.length))(
      available(setoidString, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const f2 = query((n: number) => taskEither.of(n * 2))(
      available(setoidNumber, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const p = product({ f1, f2 });
    requestAnimationFrame(() => f1.run('foo').run());
    const results = await observe(
      p,
      { f1: 'foo', f2: 1 },
      getQueryResultSetoid(setoidStrict, setoidShallow)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: { f1: 3, f2: 2 }, loading: false }
    ]);
  });

  it('product - product observer is notified with failure on f<n> failure', async () => {
    const f1 = query((s: string) => taskEither.of(s.length))(
      available(setoidString, getCacheValueSetoid(setoidStrict, setoidNumber))
    );
    const f2 = query((_: number) => fromLeft<string, number>('nope'))(
      available(setoidNumber, getCacheValueSetoid(setoidString, setoidNumber))
    );
    const p = product({ f1, f2 });
    requestAnimationFrame(() => f1.run('foo').run());
    const results = await observe(
      p,
      { f1: 'foo', f2: 1 },
      getQueryResultSetoid(setoidStrict, setoidShallow)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Failure', value: 'nope', loading: false }
    ]);
  });

  it('should handle passing empty input in case of void input queries', async () => {
    const cachedA = product({
      a: query(() => taskEither.of(3))(
        available(
          setoidStrict as any,
          getCacheValueSetoid(setoidStrict, setoidNumber)
        )
      )
    });
    requestAnimationFrame(() => cachedA.run().run());
    const results = await observe(
      cachedA,
      undefined,
      getQueryResultSetoid(setoidStrict, setoidStrict)
    )
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: { a: 3 }, loading: false }
    ]);
  });

  it('compose - composition slave should not re-fetch if master result is the same according to its cacheValue setoid', async () => {
    const fmaster = jest.fn(() => taskEither.of<void, string>('foo'));
    const fslave = jest.fn((input: string) =>
      taskEither.of<void, number>(input.length)
    );
    const master = query(fmaster)(
      available(
        setoidStrict as any,
        getSetoid(setoidStrict as any, setoidString)
      )
    );
    const slave = query(fslave)(
      available(setoidString, getSetoid(setoidStrict as any, setoidNumber))
    );
    const composition = compose(
      master,
      slave
    );
    requestAnimationFrame(() => master.run().run());
    setTimeout(() => master.invalidate().run(), 10);
    const results = await observe(
      composition,
      undefined,
      fromEquals(() => false)
    )
      .pipe(
        take(4),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', loading: false, value: 3 },
      { type: 'Loading' },
      { type: 'Success', loading: false, value: 3 }
    ]);
    expect(fmaster.mock.calls.length).toBe(2);
    expect(fslave.mock.calls.length).toBe(1);
  });

  it('when a query is observed, it is not yet run', async () => {
    const queryMock = jest.fn(() => {});
    const a = makeQuery(queryMock);
    observe(a, 1, setoidStrict);
    await wait(10);

    expect(queryMock.mock.calls.length).toBe(0);
  });

  it('when someone subscribe to a query, the query is run', async () => {
    const queryMock = jest.fn(() => {});
    const a = makeQuery(queryMock);
    observe(a, 1, setoidStrict).subscribe(() => {});
    await wait(10);

    expect(queryMock.mock.calls.length).toBe(1);
  });

  it('when you compose two queries, none of them is run before there is a subscription', async () => {
    const masterMock = jest.fn(() => {});
    const slaveMock = jest.fn(() => {});
    const a = makeQuery(masterMock);
    const b = makeQuery(slaveMock);
    observe(
      compose(
        a,
        b
      ),
      1,
      setoidStrict
    );
    await wait(10);

    expect(masterMock.mock.calls.length).toBe(0);
    expect(slaveMock.mock.calls.length).toBe(0);
  });

  it('when there is a subscription to a composed query, both queries in the composition are run', async () => {
    const masterMock = jest.fn(() => {});
    const slaveMock = jest.fn(() => {});
    const a = makeQuery(masterMock);
    const b = makeQuery(slaveMock);
    observe(
      compose(
        a,
        b
      ),
      1,
      setoidStrict
    ).subscribe(a => a);
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
    observe(
      compose(
        a,
        b
      ),
      1,
      setoidStrict
    ).subscribe(eventDispatchMock);
    await wait(10);
    invalidate({ a }, { a: 1 }).run();
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
    observe(
      compose(
        a,
        b
      ),
      1,
      setoidStrict
    ).subscribe(eventDispatchMock);
    await wait(10);
    invalidate({ a }, { a: 1 }).run();
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
    observe(
      compose(
        a,
        b
      ),
      1,
      setoidStrict
    ).subscribe(eventDispatchMock);
    await wait(10);
    invalidate({ b }, { b: 1 }).run();
    await wait(10);

    expect(masterMock.mock.calls.length).toBe(1);
    expect(eventDispatchMock.mock.calls.length).toBe(4);
    expect(slaveMock.mock.calls.length).toBe(2);
  });
});
