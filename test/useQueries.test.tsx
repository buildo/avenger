import * as React from 'react';
import { render, waitForElement, cleanup } from 'react-testing-library';
import { queryStrict, refetch, invalidate } from '../src/DSL';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { useQueries, useQuery } from '../src/react';

describe('useQueries', () => {
  it('should work', async () => {
    const foo = queryStrict(() => taskEither.of<void, string>('foo'), refetch);
    function Foo() {
      const f = useQueries({ foo });
      return (
        <>
          {f.fold(
            () => 'loading',
            () => 'failure',
            ({ foo }) => foo
          )}
        </>
      );
    }

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('foo'));
    cleanup();
  });

  it('should rerender after an invalidate', async () => {
    const res = { value: 'foo' };
    const foof = jest.fn(() => taskEither.of<void, string>(res.value));
    const foo = queryStrict(foof, refetch);
    const Foo = jest.fn(() => {
      const f = useQueries({ foo });
      return (
        <>
          {f.fold(
            () => 'loading',
            () => 'failure',
            ({ foo }) => foo
          )}
        </>
      );
    });

    const element = React.createElement(Foo);
    const { getByText, rerender } = await render(element);
    await waitForElement(() => getByText('foo'));
    expect(Foo).toHaveBeenCalledTimes(2);
    expect(foof).toHaveBeenCalledTimes(1);
    res.value = 'bar';
    await invalidate({ foo }).run();
    await rerender(element);
    await waitForElement(() => getByText('bar'));
    expect(Foo).toHaveBeenCalledTimes(4);
    expect(foof).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it('should re-subscribe when input changes', async () => {
    const foo = queryStrict(
      (a: string) => taskEither.of<void, number>(a.length),
      refetch
    );
    function Foo() {
      const [a, setA] = React.useState('foo');
      React.useEffect(() => {
        setTimeout(() => setA('foos'), 10);
      }, []);
      const f = useQueries({ foo }, { foo: a });
      return (
        <>
          {f.fold(
            () => 'loading',
            () => 'failure',
            ({ foo }) => String(foo)
          )}
        </>
      );
    }

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('4'));
    cleanup();
  });

  it('should re-subscribe when queries change', async () => {
    const fooA = queryStrict(
      () => taskEither.of<void, string>('fooA'),
      refetch
    );
    const fooB = queryStrict(
      () => taskEither.of<void, string>('fooB'),
      refetch
    );
    function Foo() {
      const [b, setB] = React.useState(false);
      React.useEffect(() => {
        setTimeout(() => setB(true), 10);
      }, []);
      const f = useQueries({ foo: b ? fooB : fooA });
      return (
        <>
          {f.fold(
            () => 'loading',
            () => 'failure',
            ({ foo }) => foo
          )}
        </>
      );
    }

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('fooB'));
    cleanup();
  });
});

describe('useQuery', () => {
  it('should re-subscribe when query changes', async () => {
    const fooA = queryStrict(
      () => taskEither.of<void, string>('fooA'),
      refetch
    );
    const fooB = queryStrict(
      () => taskEither.of<void, string>('fooB'),
      refetch
    );
    function Foo() {
      const [b, setB] = React.useState(false);
      React.useEffect(() => {
        setTimeout(() => setB(true), 10);
      }, []);
      const f = useQuery(b ? fooB : fooA);
      return (
        <>
          {f.fold(
            () => 'loading',
            () => 'failure',
            foo => foo
          )}
        </>
      );
    }

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('fooB'));
    cleanup();
  });
});
