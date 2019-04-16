import * as React from 'react';
import { render, waitForElement } from 'react-testing-library';
import { queryShallow, refetch, invalidate } from '../src/DSL';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { useQuery } from '../src/react';
import { identity } from 'fp-ts/lib/function';

xdescribe('useQuery', () => {
  let container: Element | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container!);
    container = null;
  });

  it('should work', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const foo = queryShallow(() => taskEither.of<void, string>('foo'), refetch);
    function Foo() {
      const f = useQuery(foo);
      return <p>{f.fold('loading', () => 'failure', identity)}</p>;
    }

    const { getByText } = await render(<Foo />);
    await waitForElement(() => getByText('foo'));
  });

  it('should rerender after an invalidate', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const res = { value: 'foo' };
    const foof = jest.fn(() => taskEither.of<void, string>(res.value));
    const foo = queryShallow(foof, refetch);
    const Foo = jest.fn(() => {
      const f = useQuery(foo);
      return <p>{f.fold('loading', () => 'failure', identity)}</p>;
    });

    const element = React.createElement(Foo);
    const { getByText, rerender } = await render(element);
    await waitForElement(() => getByText('foo'));
    expect(Foo.mock.calls.length).toBe(2);
    expect(foof.mock.calls.length).toBe(1);
    res.value = 'bar';
    await invalidate({ foo }, {}).run();
    await rerender(element);
    await waitForElement(() => getByText('bar'));
    expect(Foo.mock.calls.length).toBe(4);
    expect(foof.mock.calls.length).toBe(2);
  });
});
