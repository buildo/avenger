import { query, queryStrict } from '../src/Query';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { setoidNumber, setoidString } from 'fp-ts/lib/Setoid';
import { available, setoidStrict, refetch } from '../src/Strategy';
import { getSetoid } from '../src/CacheValue';
import { invalidate } from '../src/invalidate';
import { observeStrict } from '../src/observe';
import { take, toArray } from 'rxjs/operators';

describe('invalidate', () => {
  it('should invalidate a set of queries', async () => {
    const obj = {
      a: (a: number) => taskEither.of(a * 2),
      b: (b: string) => taskEither.of(b.length)
    };
    const aSpy = jest.spyOn(obj, 'a');
    const bSpy = jest.spyOn(obj, 'b');
    const a = query(obj.a)(
      available(setoidNumber, getSetoid(setoidStrict, setoidNumber))
    );
    const b = query(obj.b)(
      available(setoidString, getSetoid(setoidStrict, setoidNumber))
    );

    // run once
    await Promise.all([a.run(1).run(), b.run('foo').run()]);
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);

    // run again, without invalidating
    await Promise.all([a.run(1).run(), b.run('foo').run()]);
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);

    // invalidate
    await invalidate({ a, b }, { a: 1, b: 'foo' }).run();
    expect(aSpy.mock.calls.length).toBe(2);
    expect(bSpy.mock.calls.length).toBe(2);
  });

  it('should work when omitting void query input params', async () => {
    const obj = {
      a: () => taskEither.of(2)
    };
    const aSpy = jest.spyOn(obj, 'a');
    const a = queryStrict(obj.a, available);

    // run once
    await a.run().run();
    expect(aSpy.mock.calls.length).toBe(1);

    // run again, without invalidating
    await a.run().run();
    expect(aSpy.mock.calls.length).toBe(1);

    // invalidate
    await invalidate({ a }).run();
    expect(aSpy.mock.calls.length).toBe(2);
  });

  it('observers should see update events after an invalidate', async () => {
    const af = jest.fn(() => taskEither.of(2));
    const a = queryStrict(af, refetch);
    setTimeout(() => a.run().run());
    setTimeout(() => a.invalidate().run(), 20);
    const results = await observeStrict(a, undefined)
      .pipe(
        take(4),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      { type: 'Success', value: 2, loading: false },
      { type: 'Loading' },
      { type: 'Success', value: 2, loading: false }
    ]);
    expect(af.mock.calls.length).toBe(2);
  });
});
