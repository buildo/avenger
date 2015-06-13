import expect from 'expect';
import AvengerCache from '../../src/AvengerCache';
import AvengerInput from '../../src/AvengerInput';
import { actualizeParameters } from '../../src/internals';
import { hashedParams } from '../../src/AvengerCache';
import queries from '../../fixtures/queries';

const fixtureState = {
  myId: {
    'foo:bar': 42,
    'foo:baz': 101
  },
  optimisticQ: {
    '∅': { optimistic: 'optimisticFoo' }
  },
  manualQ: {
    '∅': { manual: 'manualFoo' }
  }
};

describe('AvengerCache', () => {

  describe('hashedParams', () => {

    it('should work for AllowedParams', () => {
      const hashed = hashedParams({
        a: true,
        b: 42.1,
        c: 'foo'
      });
      expect(hashed).toBe('a:true-b:42.1-c:foo');
    });

    it('should be sort of deterministic', () => {
      expect(hashedParams({
        a: true,
        b: 42.1,
        c: 'foo'
      })).toBe(hashedParams({
        c: 'foo',
        a: true,
        b: 42.1
      }));
    });

  });

  it('should accept an initial state', () => {
    const cache = new AvengerCache(fixtureState);

    expect(cache.get('myId', { foo: 'bar' })).toBe(42);
    expect(cache.get('myId', { foo: 'baz' })).toBe(101);
  });

  it('should be serializable', () => {
    expect(new AvengerCache(fixtureState).toJSON()).toEqual(fixtureState);
  });

  it('should be actualizable', () => {
    const { cacheDependentQ } = queries({});
    const input = AvengerInput({ queries: [{
      query: cacheDependentQ
    }] });
    const cache = new AvengerCache(fixtureState);
    const actualizedCache = cache.actualize(actualizeParameters(input));

    expect(Object.keys(actualizedCache).length).toBe(2);
    expect(Object.keys(actualizedCache)).toContain('optimisticQ');
    expect(Object.keys(actualizedCache)).toContain('manualQ');
    expect(actualizedCache.optimisticQ.value).toEqual(fixtureState.optimisticQ['∅']);
    expect(actualizedCache.manualQ.value).toEqual(fixtureState.manualQ['∅']);
  });

});