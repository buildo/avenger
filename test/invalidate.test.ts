import { query, invalidate } from '../src';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { setoidNumber, setoidString } from 'fp-ts/lib/Setoid';

describe('invalidate', () => {
  it('should invalidate a set of queries', async () => {
    const obj = {
      a: (a: number) => taskEither.of(a * 2),
      b: (b: string) => taskEither.of(b.length)
    };
    const aSpy = jest.spyOn(obj, 'a');
    const bSpy = jest.spyOn(obj, 'b');
    const a = query(obj.a, setoidNumber);
    const b = query(obj.b, setoidString);

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
});
