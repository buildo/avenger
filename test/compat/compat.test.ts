import { Query } from '../../src/compat';
import { param, available } from '../../src/DSL';
import { taskEither, fromPredicate } from 'fp-ts/lib/TaskEither';
import { observeShallow } from '../../src/observe';
import { take, toArray } from 'rxjs/operators';

describe('compat', () => {
  it('???', async () => {
    const a = Query({ n: param<number>() })(({ n }) => taskEither.of(n * 2))(
      available
    );
    const b = Query({ id: param<string>() })(({ id }) =>
      taskEither.of({ id, n: id.length })
    )(available);
    const c = Query({ a, b })(({ a, b }) =>
      fromPredicate<'invalid N', typeof b>(
        b => b.n + a < 10,
        () => 'invalid N'
      )(b)
    )(available);

    requestAnimationFrame(() =>
      c
        .run({
          a: { n: 1 },
          b: { id: 'foo' }
        })
        .run()
    );
    const results = await observeShallow(c, {
      a: { n: 1 },
      b: { id: 'foo' }
    })
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();
    expect(results).toEqual([
      { type: 'Loading' },
      {
        type: 'Success',
        value: {
          id: 'foo',
          n: 3
        },
        loading: false
      }
    ]);
  });
});
