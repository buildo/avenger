import * as React from 'react';
import { render, waitForElement, cleanup } from 'react-testing-library';
import { queryStrict, refetch, invalidate } from '../src/DSL';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { declareQueries } from '../src/react';
import { identity } from 'fp-ts/lib/function';

describe('declareQueries', () => {
  it('should work', async () => {
    const foo = queryStrict(() => taskEither.of<void, string>('foo'), refetch);
    const queries = declareQueries({ foo });
    const Foo = queries((props: typeof queries.Props) => {
      return (
        <>
          {props.queries.fold(
            () => 'loading',
            () => 'failure',
            ({ foo }) => foo
          )}
        </>
      );
    });

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('foo'));
    cleanup();
  });

  it('should rerender after an invalidate', async () => {
    const res = { value: 'foo' };
    const foof = jest.fn(() => taskEither.of<void, string>(res.value));
    const foo = queryStrict(foof, refetch);
    const queries = declareQueries({ foo });
    const Foo_ = jest.fn((props: typeof queries.Props) => {
      return (
        <>
          {props.queries.fold(
            () => 'loading',
            () => 'failure',
            ({ foo }) => foo
          )}
        </>
      );
    });
    const Foo = queries(Foo_);

    const element = React.createElement(Foo);
    const { getByText, rerender } = await render(element);
    await waitForElement(() => getByText('foo'));
    // why 3 and not 2?
    // Currently declareQueries subscribes in componentDidMount, after
    // the first render which has already happened using monoidResult.empty as query result.
    // Since we a) don't have a way of comparing result (i.e. no resultSetoid) and b) it's unsafe
    // to call subscribe and potentially trigger a setState before the component is mounted,
    // this is expected
    expect(Foo_).toHaveBeenCalledTimes(3);
    expect(foof).toHaveBeenCalledTimes(1);
    res.value = 'bar';
    await invalidate({ foo }).run();
    await rerender(element);
    await waitForElement(() => getByText('bar'));
    expect(Foo_).toHaveBeenCalledTimes(5); // why 5 and not 4? See comment above
    expect(foof).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it('should re-subscribe when input changes', async () => {
    const foo = queryStrict(
      (a: string) => taskEither.of<void, number>(a.length),
      refetch
    );
    const queries = declareQueries({ foo });
    const Foo = queries((props: typeof queries.Props) => {
      return (
        <>
          {props.queries.fold(
            () => 'loading',
            () => 'failure',
            ({ foo }) => String(foo)
          )}
        </>
      );
    });
    const FooParent = () => {
      const [a, setA] = React.useState('foo');
      React.useEffect(() => {
        setTimeout(() => setA('foos'), 10);
      }, []);

      return <Foo queries={{ foo: a }} />;
    };

    const { getByText } = await render(<FooParent />);
    await waitForElement(() => getByText('4'));
    cleanup();
  });

  it('should honour default monoid result and maintain the latest Success through loadings caused by an invalidation', async () => {
    let res = 'foo';
    const foo = queryStrict(() => taskEither.of<void, string>(res), refetch);
    const whenLoading = jest.fn(() => 'loading');
    const whenSuccess = jest.fn(identity);
    const queries = declareQueries({ foo });
    const Foo = queries((props: typeof queries.Props) => {
      React.useEffect(() => {
        setTimeout(() => {
          res = 'foos';
          foo.invalidate().run();
        }, 10);
      }, []);
      return props.queries
        .map(q => q.foo)
        .fold(whenLoading, () => 'failure', whenSuccess);
    });

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
});
