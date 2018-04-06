import { runCommand } from '../src/runCommand';
import { Command } from '../src/Command';
import { Query } from '../src/QueryNode';
import { query } from '../src/query';

describe('runCommand', () => {
  it('should run an empty command', () => {
    const c = Command({ params: {}, run: () => Promise.resolve() });
    return runCommand(c, {});
  });

  const fetchFoo = jest.fn(({ foo }) => Promise.resolve(foo));
  it('should run a command with params and invalidate queries', async () => {
    const q = Query({
      params: { foo: true },
      fetch: fetchFoo
    });

    query({ q }, { foo: 'foo' }).subscribe(() => {})
    expect(fetchFoo.mock.calls.length).toBe(1);
    expect(fetchFoo.mock.calls[0][0]).toEqual({ foo: 'foo' });

    const c = Command({
      invalidates: { q },
      params: { bar: true },
      run: ({ bar }) => Promise.resolve(bar)
    });

    const result = await runCommand(c, { foo: 'foo', bar: 'bar' });
    expect(result).toBe('bar');
    expect(fetchFoo.mock.calls.length).toBe(2);
    expect(fetchFoo.mock.calls[1][0]).toEqual({ foo: 'foo' });
    return result;
  });
});
