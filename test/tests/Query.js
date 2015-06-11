import t from 'tcomb';
import assert from 'better-assert';
import Query from '../../src/Query';

describe('Query', () => {
  it('should have the right structure', () => {
    const q1 = new Query({
      id: 'q1',
      paramsType: t.struct({
        orderId: t.Num
      }),
      fetchResultType: t.struct({
        order: t.Any
      }),
      fetch: (params) => () => ({
        order: null
      })
    });
    const q2 = new Query({
      id: 'q2',
      paramsType: t.struct({
        id: t.Num
      }),
      fetchResultType: t.struct({
        result: t.Any
      }),
      dependencies: [
        {
          query: q1,
          fetchParams: (q1) => ({
            a: 'a'
          }),
          multi: 'p1'
        }
      ],
      fetch: (params) => (q1) => ({
        result: q1.a
      })
    });
    assert(Query.is(q1));
    assert(Query.is(q2));
  });
});