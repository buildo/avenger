import { command } from '../src/command';
import * as TE from 'fp-ts/lib/TaskEither';
import * as Eq from 'fp-ts/lib/Eq';
import { Fetch, query } from '../src/Query';
import * as S from '../src/Strategy';
import * as CV from '../src/CacheValue';
import { observe } from '../src/observe';
import * as T from 'fp-ts/lib/Task';

describe('command', () => {
  it('should run a command and then invalidate if it was successful', async () => {
    let events: CV.CacheValue<unknown, unknown>[] = [];
    const eventsSpy = jest.fn(e => events.push(e));
    const aSpy = jest.fn((a: number) => TE.taskEither.of(a * 2));
    const bSpy = jest.fn((b: string) => TE.taskEither.of(b.length));
    const a = query(aSpy)(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const b = query(bSpy)(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const c: Fetch<string, string, number> = () => TE.taskEither.of(1);
    const cmd = command(c, { a, b });

    // run queries once first
    observe(a, 1, Eq.eqStrict).subscribe(eventsSpy);
    observe(b, 'foo', Eq.eqStrict).subscribe(eventsSpy);
    await T.delay(10)(T.of(void 0))();
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);

    // run command
    await cmd('bar', { a: 1, b: 'foo' })();
    expect(aSpy.mock.calls.length).toBe(2);
    expect(bSpy.mock.calls.length).toBe(2);
  });

  it('should run a command and skip invalidation if it fails', async () => {
    let events: CV.CacheValue<unknown, unknown>[] = [];
    const eventsSpy = jest.fn(e => events.push(e));
    const aSpy = jest.fn((a: number) => TE.taskEither.of(a * 2));
    const bSpy = jest.fn((b: string) => TE.taskEither.of(b.length));
    const a = query(aSpy)(
      S.available(Eq.eqNumber, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const b = query(bSpy)(
      S.available(Eq.eqString, CV.getEq(Eq.eqStrict, Eq.eqNumber))
    );
    const c: Fetch<string, string, number> = () => TE.left('nope');
    const cmd = command(c, { a, b });

    // run queries once first
    observe(a, 1, Eq.eqStrict).subscribe(eventsSpy);
    observe(b, 'foo', Eq.eqStrict).subscribe(eventsSpy);
    await T.delay(10)(T.of(void 0))();
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);

    // run command
    await cmd('bar', { a: 1, b: 'foo' })();
    expect(aSpy.mock.calls.length).toBe(1);
    expect(bSpy.mock.calls.length).toBe(1);
  });
});
