import { command } from '../src/command';
import { taskEither, fromLeft } from 'fp-ts/lib/TaskEither';
import { setoidNumber, setoidString } from 'fp-ts/lib/Setoid';
import { Fetch, query } from '../src/Query';
import { available, setoidStrict } from '../src/Strategy';
import { getSetoid, CacheValue } from '../src/CacheValue';
import { observe } from '../src/observe';
import { delay } from 'fp-ts/lib/Task';

describe('command', () => {
  it('should run a command and then invalidate if it was successful', async () => {
    let events: CacheValue<unknown, unknown>[] = [];
    const eventsSpy = jest.fn(e => events.push(e));
    const aSpy = jest.fn((a: number) => taskEither.of(a * 2));
    const bSpy = jest.fn((b: string) => taskEither.of(b.length));
    const a = query(aSpy)(
      available(setoidNumber, getSetoid(setoidStrict, setoidNumber))
    );
    const b = query(bSpy)(
      available(setoidString, getSetoid(setoidStrict, setoidNumber))
    );
    const c: Fetch<string, string, number> = () => taskEither.of(1);
    const cmd = command(c, { a, b });

    // run queries once first
    observe(a, 1, setoidStrict).subscribe(eventsSpy);
    observe(b, 'foo', setoidStrict).subscribe(eventsSpy);
    await delay(10, void 0).run();
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);

    // run command
    await cmd('bar', { a: 1, b: 'foo' }).run();
    expect(aSpy.mock.calls.length).toBe(2);
    expect(bSpy.mock.calls.length).toBe(2);
  });

  it('should run a command and skip invalidation if it fails', async () => {
    let events: CacheValue<unknown, unknown>[] = [];
    const eventsSpy = jest.fn(e => events.push(e));
    const aSpy = jest.fn((a: number) => taskEither.of(a * 2));
    const bSpy = jest.fn((b: string) => taskEither.of(b.length));
    const a = query(aSpy)(
      available(setoidNumber, getSetoid(setoidStrict, setoidNumber))
    );
    const b = query(bSpy)(
      available(setoidString, getSetoid(setoidStrict, setoidNumber))
    );
    const c: Fetch<string, string, number> = () => fromLeft('nope');
    const cmd = command(c, { a, b });

    // run queries once first
    observe(a, 1, setoidStrict).subscribe(eventsSpy);
    observe(b, 'foo', setoidStrict).subscribe(eventsSpy);
    await delay(10, void 0).run();
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);

    // run command
    await cmd('bar', { a: 1, b: 'foo' }).run();
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);
  });
});
