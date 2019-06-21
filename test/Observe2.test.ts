import { query, compose } from '../src/Query';
import { taskEither, TaskEither } from 'fp-ts/lib/TaskEither';
import { refetch, invalidate } from '../src';
import { setoidStrict } from '../src/Strategy';
import { observe } from '../src/observe';
import { setoidNumber, setoidString } from 'fp-ts/lib/Setoid';
import { getSetoid as getCacheValueSetoid } from '../src/CacheValue';

// 'should handle passing empty input in case of void input queries'
// 'product - product observer is notified with failure on f<n> failure'

const makeQuery = (f: jest.Mock, increasingResult?: boolean) => {
  let i = 0;
  return query((a: number) => {
    f();
    const result = increasingResult ? a + i : a;
    i++;
    return taskEither.of(result) as TaskEither<string, number>;
  })(refetch(setoidNumber, getCacheValueSetoid(setoidString, setoidNumber)));
};

const wait = (timeout: number) =>
  new Promise(resolve => setTimeout(() => resolve(false), timeout));

describe('Observe queries', () => {
  it('when a query is observed, it is not yet run', async () => {
    const queryMock = jest.fn(() => {});
    const a = makeQuery(queryMock);
    observe(a, 1, setoidStrict);
    await wait(10);

    expect(queryMock.mock.calls.length).toBe(0);
  });

  it('when someone subscribe to a query, the query is run', async () => {
    const queryMock = jest.fn(() => {});
    const a = makeQuery(queryMock);
    observe(a, 1, setoidStrict).subscribe(() => {});
    await wait(10);

    expect(queryMock.mock.calls.length).toBe(1);
  });

  it('when you compose two queries, none of them is run before there is a subscription', async () => {
    const masterMock = jest.fn(() => {});
    const slaveMock = jest.fn(() => {});
    const a = makeQuery(masterMock);
    const b = makeQuery(slaveMock);
    observe(
      compose(
        a,
        b
      ),
      1,
      setoidStrict
    );
    await wait(10);

    expect(masterMock.mock.calls.length).toBe(0);
    expect(slaveMock.mock.calls.length).toBe(0);
  });

  it('when there is a subscription to a composed query, both queries in the composition are run', async () => {
    const masterMock = jest.fn(() => {});
    const slaveMock = jest.fn(() => {});
    const a = makeQuery(masterMock);
    const b = makeQuery(slaveMock);
    observe(
      compose(
        a,
        b
      ),
      1,
      setoidStrict
    ).subscribe(a => a);
    await wait(10);

    expect(masterMock.mock.calls.length).toBe(1);
    expect(slaveMock.mock.calls.length).toBe(1);
  });

  it('in a composed query, when the master is invalidated but returns the same value as before, the slave is NOT re-run and the update is dispatched', async () => {
    const masterMock = jest.fn(() => {});
    const slaveMock = jest.fn(() => {});
    const eventDispatchMock = jest.fn(() => {});
    const a = makeQuery(masterMock);
    const b = makeQuery(slaveMock);
    observe(
      compose(
        a,
        b
      ),
      1,
      setoidStrict
    ).subscribe(eventDispatchMock);
    await wait(10);
    invalidate({ a }, { a: 1 });
    await wait(10);

    expect(masterMock.mock.calls.length).toBe(2);
    expect(eventDispatchMock.mock.calls.length).toBe(4);
    expect(slaveMock.mock.calls.length).toBe(1);
  });

  it('in a composed query, when the master is invalidated and returns a different value, the slave is re-run and the update is dispatched', async () => {
    const masterMock = jest.fn(() => {});
    const slaveMock = jest.fn(() => {});
    const eventDispatchMock = jest.fn(() => {});
    const a = makeQuery(masterMock, true);
    const b = makeQuery(slaveMock, true);
    observe(
      compose(
        a,
        b
      ),
      1,
      setoidStrict
    ).subscribe(eventDispatchMock);
    await wait(10);
    invalidate({ a }, { a: 1 });
    await wait(10);

    expect(masterMock.mock.calls.length).toBe(2);
    expect(eventDispatchMock.mock.calls.length).toBe(4);
    expect(slaveMock.mock.calls.length).toBe(2);
  });

  it('in a composed query, when the slave is invalidated the master is not re-run and the update is dispatched', async () => {
    const masterMock = jest.fn(() => {});
    const slaveMock = jest.fn(() => {});
    const eventDispatchMock = jest.fn(() => {});
    const a = makeQuery(masterMock);
    const b = makeQuery(slaveMock);
    observe(
      compose(
        a,
        b
      ),
      1,
      setoidStrict
    ).subscribe(eventDispatchMock);
    await wait(10);
    invalidate({ b }, { b: 1 });
    await wait(10);

    expect(masterMock.mock.calls.length).toBe(1);
    expect(eventDispatchMock.mock.calls.length).toBe(4);
    expect(slaveMock.mock.calls.length).toBe(2);
  });
});
