import { query, compose } from '../src/Query';
import { taskEither, TaskEither } from 'fp-ts/lib/TaskEither';
import { refetch, invalidate } from '../src';
import { setoidStrict } from '../src/Strategy';
import { observe } from '../src/observe';
import { setoidNumber, setoidString } from 'fp-ts/lib/Setoid';
import { getSetoid as getCacheValueSetoid } from '../src/CacheValue';

const makeQuery = (f: jest.Mock) => {
  return query((a: number) => {
    f();
    return taskEither.of(a) as TaskEither<string, number>;
  })(refetch(setoidNumber, getCacheValueSetoid(setoidString, setoidNumber)));
};

describe('Observing queries', () => {
  it('when a query is observed, it is not yet run', () => {
    const queryMock = jest.fn(() => {});
    const a = makeQuery(queryMock);

    observe(a, 1, setoidStrict);
    expect(queryMock.mock.calls.length).toBe(0);
  });

  it('when someone subscribe to a query, the query is run', () => {
    const queryMock = jest.fn(() => {});
    const a = makeQuery(queryMock);

    observe(a, 1, setoidStrict).subscribe(a => a);
    setTimeout(() => expect(queryMock.mock.calls.length).toBe(1), 0);
  });

  it('when you compose two queries, none of them is run before there is a subscription', () => {
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

    setTimeout(() => expect(masterMock.mock.calls.length).toBe(0), 0);
    setTimeout(() => expect(slaveMock.mock.calls.length).toBe(0), 0);
  });

  it('when there is a subscription to a composed query, both queries in the composition are run', () => {
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

    setTimeout(() => expect(masterMock.mock.calls.length).toBe(1), 0);
    setTimeout(() => expect(slaveMock.mock.calls.length).toBe(1), 0);
  });

  it('in a composed query, when the master is invalidated the slave is re-run too and the update is dispatched', () => {
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

    invalidate({ a }, { a: 1 });
    setTimeout(() => expect(masterMock.mock.calls.length).toBe(2), 0);
    setTimeout(() => expect(slaveMock.mock.calls.length).toBe(2), 0);
    setTimeout(() => expect(eventDispatchMock.mock.calls.length).toBe(2), 0);
  });

  it('in a composed query, when the slave is invalidated the master is not re-run and the update is dispatched', () => {
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
    ).subscribe(a => a);

    invalidate({ b }, { b: 1 });
    setTimeout(() => expect(masterMock.mock.calls.length).toBe(1), 0);
    setTimeout(() => expect(slaveMock.mock.calls.length).toBe(2), 0);
    setTimeout(() => expect(eventDispatchMock.mock.calls.length).toBe(2), 0);
  });
});
