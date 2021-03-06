import * as React from 'react';
import { render, waitForElement, cleanup } from 'react-testing-library';
import { queryStrict, refetch, invalidate } from '../src/DSL';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { useQueries, useQuery } from '../src/react';
import * as QR from '../src/QueryResult';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';

describe('useQueries', () => {
  it('should work', async () => {
    const foo = queryStrict(() => taskEither.of<void, string>('foo'), refetch);
    function Foo() {
      return (
        <>
          {pipe(
            useQueries({ foo }),
            QR.fold(
              () => 'loading',
              () => 'failure',
              ({ foo }) => foo
            )
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
      return (
        <>
          {pipe(
            useQueries({ foo }),
            QR.fold(
              () => 'loading',
              () => 'failure',
              ({ foo }) => foo
            )
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
    await invalidate({ foo })();
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
      return (
        <>
          {pipe(
            useQueries({ foo }, { foo: a }),
            QR.fold(
              () => 'loading',
              () => 'failure',
              ({ foo }) => String(foo)
            )
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
      return (
        <>
          {pipe(
            useQueries({ foo: b ? fooB : fooA }),
            QR.fold(
              () => 'loading',
              () => 'failure',
              ({ foo }) => foo
            )
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
      return (
        <>
          {pipe(
            useQuery(b ? fooB : fooA),
            QR.fold(
              () => 'loading',
              () => 'failure',
              foo => foo
            )
          )}
        </>
      );
    }

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('fooB'));
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
      return (
        <>
          {pipe(
            useQuery(foo, a),
            QR.fold(
              () => 'loading',
              () => 'failure',
              String
            )
          )}
        </>
      );
    }

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('4'));
    cleanup();
  });

  it('should honour default monoid result and maintain the latest Success through loadings', async () => {
    const foo = queryStrict(
      (a: string) => taskEither.of<void, number>(a.length),
      refetch
    );
    const whenLoading = jest.fn(() => 'loading');
    const whenSuccess = jest.fn(String);
    function Foo() {
      const [a, setA] = React.useState('foo');
      React.useEffect(() => {
        setTimeout(() => setA('foos'), 10);
      }, []);
      return (
        <>
          {pipe(
            useQuery(foo, a),
            QR.fold(whenLoading, () => 'failure', whenSuccess)
          )}
        </>
      );
    }

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('4'));
    expect(whenLoading).toHaveBeenCalledTimes(1);
    expect(whenSuccess).toHaveBeenCalledTimes(
      1 /* first Success */ +
      2 /* setState + first rerender by useQuery with previous success */ +
        2 /* re-fetch after set state, no Loadings -> 2 Successes */
    );

    cleanup();
  });

  it('should honour default monoid result and maintain the latest Success through loadings caused by an invalidation', async () => {
    let res = 'foo';
    const foo = queryStrict(() => taskEither.of<void, string>(res), refetch);
    const whenLoading = jest.fn(() => 'loading');
    const whenSuccess = jest.fn(identity);
    function Foo() {
      const f = useQuery(foo);
      React.useEffect(() => {
        setTimeout(() => {
          res = 'foos';
          foo.invalidate()();
        }, 10);
      }, []);
      return (
        <>
          {pipe(
            f,
            QR.fold(whenLoading, () => 'failure', whenSuccess)
          )}
        </>
      );
    }

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('foos'));
    expect(whenLoading).toHaveBeenCalledTimes(1);
    expect(whenSuccess).toHaveBeenCalledTimes(
      1 /* first Success */ +
        2 /* re-fetch after set state, no Loading -> 2 Successes */
    );
    cleanup();
  });
});
