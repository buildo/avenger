import { Query } from '../../src/graph/QueryNode';

describe('QueryNode', () => {
  describe('upsetParams', () => {
    it('should include all dependencies params recursively, flattened', () => {
      const a = Query({
        params: { foo: true },
        fetch: Promise.resolve.bind(Promise)
      });
      const b = Query({
        params: { bar: true },
        dependencies: { a },
        fetch: Promise.resolve.bind(Promise)
      });
      const c = Query({
        params: { baz: true },
        dependencies: { b },
        fetch: Promise.resolve.bind(Promise)
      });
      expect(c.upsetParams).toEqual({ foo: true, bar: true, baz: true });
    });
  })
})
