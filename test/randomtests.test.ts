import { taskEither, fromLeft } from 'fp-ts/lib/TaskEither';
import { take, toArray } from 'rxjs/operators';
import { getStructSetoid, setoidString, setoidNumber } from 'fp-ts/lib/Setoid';
import { query, compose, product, observe } from '../src';

it('does something', async () => {
  const a = (input: number) => taskEither.of(input);
  const cachedA = query(a, setoidNumber);
  requestAnimationFrame(() => cachedA.run(1));
  const results = await observe(cachedA, 1)
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

it('caches indefinitely (temporarily since no strategies - will change)', async () => {
  const a = (input: number) => taskEither.of(input);
  const cachedA = query(a, setoidNumber);
  requestAnimationFrame(() => cachedA.run(1));
  const results1 = await observe(cachedA, 1)
    .pipe(
      take(2),
      toArray()
    )
    .toPromise();
  expect(results1).toEqual([
    { type: 'Loading' },
    { type: 'Success', value: 1, loading: false }
  ]);
  requestAnimationFrame(() => cachedA.run(1));
  const results2 = await observe(cachedA, 1)
    .pipe(
      take(1),
      toArray()
    )
    .toPromise();
  expect(results2).toEqual([{ type: 'Success', value: 1, loading: false }]);
});

it('new observers get the latest available result', async () => {
  const a = (input: number) => taskEither.of(input);
  const cachedA = query(a, setoidNumber);
  requestAnimationFrame(() => cachedA.run(1));
  const results1 = await observe(cachedA, 1)
    .pipe(
      take(2),
      toArray()
    )
    .toPromise();
  expect(results1).toEqual([
    { type: 'Loading' },
    { type: 'Success', value: 1, loading: false }
  ]);
  const results2 = await observe(cachedA, 1)
    .pipe(
      take(1),
      toArray()
    )
    .toPromise();
  expect(results2).toEqual([{ type: 'Success', value: 1, loading: false }]);
});

it('should reuse the same pending (primitive inputs)', async () => {
  const spyObj = { a: (input: number) => taskEither.of(input) };
  const aSpy = jest.spyOn(spyObj, 'a');
  const cachedA = query(spyObj.a, setoidNumber);
  requestAnimationFrame(() => cachedA.run(1));
  requestAnimationFrame(() => cachedA.run(1));
  const o1 = observe(cachedA, 1)
    .pipe(
      take(2),
      toArray()
    )
    .toPromise();
  const o2 = observe(cachedA, 1)
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
  const spyObj = { a: (input: { foo: string }) => taskEither.of(input) };
  const aSpy = jest.spyOn(spyObj, 'a');
  const cachedA = query(spyObj.a, getStructSetoid({ foo: setoidString }));
  const input1 = { foo: 'bar' };
  const input2 = { foo: 'bar' };
  requestAnimationFrame(() => cachedA.run(input1));
  requestAnimationFrame(() => cachedA.run(input2));
  const o1 = observe(cachedA, input1)
    .pipe(
      take(2),
      toArray()
    )
    .toPromise();
  const o2 = observe(cachedA, input2)
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
  const a = query((_: string) => fromLeft('nope'), setoidString);
  requestAnimationFrame(() => a.run('foo'));
  const results = await observe(a, 'foo')
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
  const master = query((s: string) => taskEither.of(s.length), setoidString);
  const slave = query((n: number) => taskEither.of(n * 2), setoidNumber);
  const composition = compose(
    master,
    slave
  );
  requestAnimationFrame(() => composition.run('foo'));
  // @ts-ignore
  const results = await observe(composition, 'foo')
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
  const master = query((s: string) => taskEither.of(s.length), setoidString);
  const slave = query((n: number) => taskEither.of(n * 2), setoidNumber);
  const composition = compose(
    master,
    slave
  );
  requestAnimationFrame(() => {
    // @ts-ignore
    observe(composition, 'foo').subscribe();
    composition.run('foo');
  });
  // @ts-ignore
  const results = await observe(master, 'foo')
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
  const master = query((s: string) => taskEither.of(s.length), setoidString);
  const slave = query((n: number) => taskEither.of(n * 2), setoidNumber);
  const composition = compose(
    master,
    slave
  );
  requestAnimationFrame(() => {
    // @ts-ignore
    observe(composition, 'foo').subscribe();
    composition.run('foo');
  });
  const results = await observe(slave, 3)
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
  const master = query((s: string) => taskEither.of(s.length), setoidString);
  const slave = query((n: number) => taskEither.of(n * 2), setoidNumber);
  const composition = compose(
    master,
    slave
  );
  requestAnimationFrame(() => master.run('foo'));
  // @ts-ignore
  const results = await observe(composition, 'foo')
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
  const master = query(
    (_: string) => fromLeft<string, number>('nope'),
    setoidString
  );
  const slave = query((n: number) => taskEither.of(n * 2), setoidNumber);
  const composition = compose(
    master,
    slave
  );
  requestAnimationFrame(() => master.run('foo'));
  // @ts-ignore
  const results = await observe(composition, 'foo')
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
  const master = query((s: string) => taskEither.of(s.length), setoidString);
  const slave = query(
    (_: number) => fromLeft<string, number>('nope'),
    setoidNumber
  );
  const composition = compose(
    master,
    slave
  );
  requestAnimationFrame(() => slave.run(3));
  // @ts-ignore
  const results = await observe(composition, 'foo')
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
  const f1 = query((s: string) => taskEither.of(s.length), setoidString);
  const f2 = query((n: number) => taskEither.of(n * 2), setoidNumber);
  const p = product(f1, f2);
  requestAnimationFrame(() => p.run(['foo', 2]));
  const results = await observe(p, ['foo', 2] as [string, number])
    .pipe(
      take(2),
      toArray()
    )
    .toPromise();
  expect(results).toEqual([
    { type: 'Loading' },
    { type: 'Success', value: [3, 4], loading: false }
  ]);
});

it('product - f<n> observer is notified when product is run', async () => {
  const f1 = query((s: string) => taskEither.of(s.length), setoidString);
  const f2 = query((n: number) => taskEither.of(n * 2), setoidNumber);
  const p = product(f1, f2);
  requestAnimationFrame(() => p.run(['foo', 2]));
  const results = await observe(f1, 'foo')
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
  const f1 = query((s: string) => taskEither.of(s.length), setoidString);
  const f2 = query((n: number) => taskEither.of(n * 2), setoidNumber);
  const p = product(f1, f2);
  requestAnimationFrame(() => f1.run('foo'));
  const results = await observe(p, ['foo', 1] as [string, number])
    .pipe(
      take(2),
      toArray()
    )
    .toPromise();
  expect(results).toEqual([
    { type: 'Loading' },
    { type: 'Success', value: [3, 2], loading: false }
  ]);
});

it('product - product observer is notified with failure on f<n> failure', async () => {
  const f1 = query((s: string) => taskEither.of(s.length), setoidString);
  const f2 = query(
    (_: number) => fromLeft<string, number>('nope'),
    setoidNumber
  );
  const p = product(f1, f2);
  requestAnimationFrame(() => f1.run('foo'));
  const results = await observe(p, ['foo', 1] as [string, number])
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
