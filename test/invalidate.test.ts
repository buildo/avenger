import { query, queryStrict } from '../src/Query';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { setoidNumber, setoidString } from 'fp-ts/lib/Setoid';
import { available, setoidStrict } from '../src/Strategy';
import { getSetoid } from '../src/CacheValue';
import { invalidate } from '../src/invalidate';

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

  it('should work when omitting void-queries input params', async () => {
    const obj = {
      a: () => taskEither.of(2),
      b: (b: string) => taskEither.of(b.length)
    };
    const aSpy = jest.spyOn(obj, 'a');
    const bSpy = jest.spyOn(obj, 'b');
    const a = queryStrict(obj.a, available);
    const b = query(obj.b)(
      available(setoidString, getSetoid(setoidStrict, setoidNumber))
    );

    // run once
    await Promise.all([a.run().run(), b.run('foo').run()]);
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);

    // run again, without invalidating
    await Promise.all([a.run().run(), b.run('foo').run()]);
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);

    // invalidate
    await invalidate({ a, b }, { b: 'foo' }).run();
    expect(aSpy.mock.calls.length).toBe(2);
    expect(bSpy.mock.calls.length).toBe(2);
  });
});
