import { command } from '../src/command';
import { taskEither, fromLeft } from 'fp-ts/lib/TaskEither';
import { setoidNumber, setoidString } from 'fp-ts/lib/Setoid';
import { Fetch, query } from '../src/Query';
import { available, setoidStrict } from '../src/Strategy';
import { getSetoid } from '../src/CacheValue';

describe('command', () => {
  it('should run a command and then invalidate if it was successful', async () => {
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
    const c: Fetch<string, string, number> = () => taskEither.of(1);
    const cmd = command(c, { a, b });

    // run queries once first
    await Promise.all([a.run(1).run(), b.run('foo').run()]);
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);

    // run command
    await cmd('bar', { a: 1, b: 'foo' }).run();
    expect(aSpy.mock.calls.length).toBe(2);
    expect(bSpy.mock.calls.length).toBe(2);
  });

  it('should run a command and skip invalidation if it fails', async () => {
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
    const c: Fetch<string, string, number> = () => fromLeft('nope');
    const cmd = command(c, { a, b });

    // run queries once first
    await Promise.all([a.run(1).run(), b.run('foo').run()]);
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);

    // run command
    await cmd('bar', { a: 1, b: 'foo' }).run();
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);
  });
});
