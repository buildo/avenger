import * as fc from 'fast-check';
import { shallowEqual, JSONEqual, JSONObject } from '../src/Strategy';

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

  describe('JSONEqual', () => {
    it('is reflexive and simmetric', () => {
      const reflexivity = fc.property(
        fc.anything() as fc.Arbitrary<JSONObject>,
        a => JSONEqual(a, a)
      );
      const simmetry = fc.property(
        fc.anything() as fc.Arbitrary<JSONObject>,
        fc.anything() as fc.Arbitrary<JSONObject>,
        (a, b) => JSONEqual(a, b) === JSONEqual(b, a)
      );

      fc.assert(reflexivity);
      fc.assert(simmetry);
    });

    it('should work', () => {
      expect(JSONEqual({ foo: { bar: 1 } }, { foo: { bar: 1 } })).toBe(true);
      expect(JSONEqual({ foo: { bar: 1 } }, { foo: { bar: 2 } })).toBe(false);
    });
  });
});
