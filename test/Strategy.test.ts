import * as fc from 'fast-check';
import { shallowEqual, JSONStringifyEqual } from '../src/Strategy';

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

  describe('JSONStringifyEqual', () => {
    it('is reflexive and simmetric', () => {
      const reflexivity = fc.property(fc.anything(), a =>
        JSONStringifyEqual(a, a)
      );
      const simmetry = fc.property(
        fc.anything(),
        fc.anything(),
        (a, b) => JSONStringifyEqual(a, b) === JSONStringifyEqual(b, a)
      );

      fc.assert(reflexivity);
      fc.assert(simmetry);
    });

    it('should work', () => {
      expect(JSONStringifyEqual({ foo: { bar: 1 } }, { foo: { bar: 1 } })).toBe(
        true
      );
      expect(JSONStringifyEqual({ foo: { bar: 1 } }, { foo: { bar: 2 } })).toBe(
        false
      );
    });
  });
});
