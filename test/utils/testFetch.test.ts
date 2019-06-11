import { makeTestFetch, observeNShallow } from './testFetch';
import { taskEither } from 'fp-ts/lib/TaskEither';
import { queryShallow } from '../../src/Query';
import { refetch } from '../../src';

describe('observNShallow util', () => {
  it('should resolve to an array with the received results count', async () => {
    const result = () => taskEither.of(1);
    const fetch = makeTestFetch([result]);
    const query = queryShallow(fetch, refetch);
    const results = observeNShallow(2, query);
    await query.run().run();
    expect((await results).length).toBe(2);
  });

  it('should fail if too many results are received', async () => {
    const result = () => taskEither.of(1);
    const fetch = makeTestFetch([result]);
    const query = queryShallow(fetch, refetch);
    const results = observeNShallow(1, query);
    await query.run().run(); // run once -> 2 events
    return results.then(
      () => Promise.reject(),
      error => {
        expect(error).toBe('too many results');
        return Promise.resolve();
      }
    );
  });

  it('should fail if too few results are received', async () => {
    const result = () => taskEither.of(1);
    // putting one more possible result here so that "testFetch out of range" doesn't cover observNShallow's failure
    const fetch = makeTestFetch([result, result]);
    const query = queryShallow(fetch, refetch);
    const results = observeNShallow(3, query);
    await query.run().run(); // run once -> 2 events
    return results.then(
      () => Promise.reject(),
      error => {
        expect(String(error)).toContain('Timeout');
        return Promise.resolve();
      }
    );
  });
});
