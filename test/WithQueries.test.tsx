import * as React from 'react';
import { render, waitForElement, cleanup } from 'react-testing-library';
import { queryStrict, refetch, invalidate, available } from '../src/DSL';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { WithQueries } from '../src/react';
import * as QR from '../src/QueryResult';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity, flow } from 'fp-ts/lib/function';

describe('declareQueries', () => {
  it('should work', async () => {
    const foo = queryStrict(() => taskEither.of<void, string>('foo'), refetch);
    const Foo = () => (
      <WithQueries
        queries={{ foo }}
        render={QR.fold(
          () => 'loading',
          () => 'failure',
          ({ foo }) => foo
        )}
      />
    );

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('foo'));
    cleanup();
  });

  it('should rerender after an invalidate', async () => {
    const res = { value: 'foo' };
    const foof = jest.fn(() => taskEither.of<void, string>(res.value));
    const foo = queryStrict(foof, refetch);
    const renderf = jest.fn(
      (queries: QR.QueryResult<void, { foo: typeof foo._P }>) =>
        pipe(
          queries,
          QR.fold(
            () => 'loading',
            () => 'failure',
            ({ foo }) => foo
          )
        )
    );
    const Foo = () => <WithQueries queries={{ foo }} render={renderf} />;

    const element = React.createElement(Foo);
    const { getByText, rerender } = await render(element);
    await waitForElement(() => getByText('foo'));
    // why 3 and not 2?
    // Currently WithQueries (implemented using declareQueries) subscribes in componentDidMount, after
    // the first render which has already happened using monoidResult.empty as query result.
    // Since we a) don't have a way of comparing result (i.e. no resultEq) and b) it's unsafe
    // to call subscribe and potentially trigger a setState before the component is mounted,
    // this is expected
    expect(renderf).toHaveBeenCalledTimes(3);
    expect(foof).toHaveBeenCalledTimes(1);
    res.value = 'bar';
    await invalidate({ foo })();
    await rerender(element);
    await waitForElement(() => getByText('bar'));
    expect(renderf).toHaveBeenCalledTimes(5); // Why 5 and not 4? See comment above
    expect(foof).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it('should re-subscribe when input changes', async () => {
    const foo = queryStrict(
      (a: string) => taskEither.of<void, number>(a.length),
      refetch
    );
    const Foo = () => {
      const [a, setA] = React.useState('foo');
      React.useEffect(() => {
        setTimeout(() => setA('foos'), 10);
      }, []);
      return (
        <WithQueries
          queries={{ foo }}
          params={{ foo: a }}
          render={QR.fold(
            () => 'loading',
            () => 'failure',
            ({ foo }) => String(foo)
          )}
        />
      );
    };

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('4'));
    cleanup();
  });

  it('(currently) does NOT re-subscribe when queries change', async () => {
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
        <WithQueries
          queries={{ foo: b ? fooB : fooA }}
          render={QR.fold(
            () => 'loading',
            () => 'failure',
            ({ foo }) => foo
          )}
        />
      );
    }

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('fooB'), { timeout: 500 }).catch(() =>
      waitForElement(() => getByText('fooA'))
    );
    cleanup();
  });

  it('should honour default monoid result and maintain the latest Success through loadings caused by an invalidation', async () => {
    let res = 'foo';
    const foo = queryStrict(() => taskEither.of<void, string>(res), refetch);
    const whenLoading = jest.fn(() => 'loading');
    const whenSuccess = jest.fn(identity);
    function Foo() {
      React.useEffect(() => {
        setTimeout(() => {
          res = 'foos';
          foo.invalidate()();
        }, 10);
      }, []);
      return (
        <WithQueries
          queries={{ foo }}
          render={flow(
            QR.map(q => q.foo),
            QR.fold(whenLoading, () => 'failure', whenSuccess)
          )}
        />
      );
    }

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('foos'));
    expect(whenLoading).toHaveBeenCalledTimes(
      1 + 1 /* because we subscribe in componentDidMount, see comments above */
    );
    expect(whenSuccess).toHaveBeenCalledTimes(
      1 /* first Success */ +
        2 /* re-fetch after set state, no Loading -> 2 Successes */
    );
    cleanup();
  });

  it('should honour the last "render" prop received', async () => {
    const foo = queryStrict(
      () => taskEither.of<void, unknown>(null),
      available
    );
    const a = jest.fn();
    const b = jest.fn();
    const { rerender } = await render(
      <WithQueries queries={{ foo }} render={a} />
    );
    expect(a).toHaveBeenCalledTimes(
      1 + 1 /* because we subscribe in componentDidMount, see comments above */
    );
    expect(b).toHaveBeenCalledTimes(0);
    await rerender(<WithQueries queries={{ foo }} render={b} />);
    expect(a).toHaveBeenCalledTimes(
      1 + 1 /* because we subscribe in componentDidMount, see comments above */
    );
    expect(b).toHaveBeenCalledTimes(1);
  });
});
