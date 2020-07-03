import * as fc from 'fast-check';
import { shallowEqual } from '../src/Strategy';

describe('Strategy', () => {
  describe('shallowEqual', () => {
    it('is reflexive and simmetric', () => {
      const reflexivity = fc.property(fc.anything(), a => shallowEqual(a, a));
      const simmetry = fc.property(
        fc.anything(),
        fc.anything(),
        (a, b) => shallowEqual(a, b) === shallowEqual(b, a)
      );

      fc.assert(reflexivity);
      fc.assert(simmetry);
    });

    it('should work', () => {
      expect(shallowEqual({ foo: 1 }, { foo: 1 })).toBe(true);
      expect(shallowEqual({ foo: 1 }, { foo: 2 })).toBe(false);
    });
  });
});
