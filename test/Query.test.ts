import * as TE from 'fp-ts/lib/TaskEither';
import { observe } from '../src/observe';
import * as Q from '../src/Query';
import * as S from '../src/Strategy';
import * as QR from '../src/QueryResult';
import * as T from 'fp-ts/lib/Task';
import * as E from 'fp-ts/lib/Either';
import * as Eq from 'fp-ts/lib/Eq';

describe('queryStrict', () => {
  it('caches indefinitely with strategy=available', async () => {
    let events: QR.QueryResult<unknown, unknown>[] = [];
    const eventsSpy = jest.fn(e => events.push(e));
    const a = (input: number) => TE.taskEither.of(input);
    const cachedA = Q.queryStrict(a, S.available);
    const observable = observe(cachedA, 1, Eq.eqStrict);
    observable.subscribe(eventsSpy);
    await T.delay(10)(T.of(void 0))();
    observable.subscribe(eventsSpy);
    observable.subscribe(eventsSpy);

    expect(events).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: 1, loading: false },
      { _tag: 'Success', success: 1, loading: false },
      { _tag: 'Success', success: 1, loading: false }
    ]);
  });
});

describe('queryShallow', () => {
  it('caches indefinitely with strategy=available', async () => {
    let events: QR.QueryResult<unknown, unknown>[] = [];
    const eventsSpy = jest.fn(e => events.push(e));
    const a = (input: number) => TE.taskEither.of(input);
    const cachedA = Q.queryShallow(a, S.available);
    const observable = observe(cachedA, 1, Eq.eqStrict);
    observable.subscribe(eventsSpy);
    await T.delay(10)(T.of(void 0))();
    observable.subscribe(eventsSpy);
    observable.subscribe(eventsSpy);

    expect(events).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: 1, loading: false },
      { _tag: 'Success', success: 1, loading: false },
      { _tag: 'Success', success: 1, loading: false }
    ]);
  });
});

it('map - resolves to `f(a)`', async () => {
  const a = Q.queryStrict(() => TE.taskEither.of('foo'), S.refetch);
  const b = Q.map(a, (s: string) => s.length);
  const r = await b.run()();
  expect(r).toEqual(E.right(3));
});

it('map - invalidating `a` causes an invalidation of `f(a)`', async () => {
  const f1 = jest.fn(() => TE.taskEither.of('foo'));
  const a = Q.queryStrict(f1, S.refetch);
  const f2 = jest.fn((s: string) => s.length);
  const b = Q.map(a, f2);
  const resultEq = QR.getEq(Eq.eqStrict, Eq.eqStrict);
  const observable = observe(b, undefined, resultEq);
  const observer = jest.fn();
  observable.subscribe(observer);
  await T.delay(10)(T.of(void 0))();
  expect(f1.mock.calls.length).toBe(1);
  expect(f2.mock.calls.length).toBe(1);
  expect(observer.mock.calls.length).toBe(2); // pending + value
  await a.invalidate()();
  expect(f1.mock.calls.length).toBe(2);
  expect(f2.mock.calls.length).toBe(1); // not called again since map internally uses `available`
  expect(observer.mock.calls.length).toBe(4); // (pending + value) * 2
});
