import * as Q from '../src/Query';
import * as TE from 'fp-ts/lib/TaskEither';
import * as Eq from 'fp-ts/lib/Eq';
import * as S from '../src/Strategy';
import * as CV from '../src/CacheValue';
import { invalidate } from '../src/invalidate';
import { observe } from '../src/observe';
import * as T from 'fp-ts/lib/Task';
import * as QR from '../src/QueryResult';

describe('invalidate', () => {
  it('should invalidate a set of queries', async () => {
    let events: CV.CacheValue<unknown, unknown>[] = [];
    const eventsSpy = jest.fn(e => events.push(e));
    const aSpy = jest.fn((a: number) => TE.taskEither.of(a * 2));
    const bSpy = jest.fn((b: string) => TE.taskEither.of(b.length));
    const a = Q.query(aSpy)(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const b = Q.query(bSpy)(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );

    // run queries once first
    observe(a, 1, Eq.eqStrict).subscribe(eventsSpy);
    observe(b, 'foo', Eq.eqStrict).subscribe(eventsSpy);
    await T.delay(10)(T.of(null))();

    // invalidate
    await invalidate({ a, b }, { a: 1, b: 'foo' })();
    expect(aSpy.mock.calls.length).toBe(2);
    expect(bSpy.mock.calls.length).toBe(2);
  });

  it('should work when omitting void query input params', async () => {
    let events: CV.CacheValue<unknown, unknown>[] = [];
    const aSpy = jest.fn(() => TE.taskEither.of(2));
    const a = Q.queryStrict(aSpy, S.available);
    const eventsSpy = jest.fn(e => events.push(e));

    // run once
    observe(a, undefined, Eq.eqStrict).subscribe(eventsSpy);
    await T.delay(10)(T.of(null))();
    expect(aSpy.mock.calls.length).toBe(1);

    // invalidate
    await invalidate({ a })();
    await T.delay(10)(T.of(null))();
    expect(aSpy.mock.calls.length).toBe(2);
  });

  it('observers should see updated events after an invalidate', async () => {
    let events: QR.QueryResult<unknown, unknown>[] = [];
    const aSpy = jest.fn(() => TE.taskEither.of(2));
    const a = Q.queryStrict(aSpy, S.refetch);
    const eventsSpy = jest.fn(e => events.push(e));

    // run once
    observe(a, undefined, Eq.eqStrict).subscribe(eventsSpy);
    await T.delay(10)(T.of(null))();

    // invalidate
    await invalidate({ a })();
    await T.delay(10)(T.of(null))();

    expect(events).toEqual([
      { _tag: 'Loading' },
      { _tag: 'Success', success: 2, loading: false },
      { _tag: 'Loading' },
      { _tag: 'Success', success: 2, loading: false }
    ]);
  });
});
