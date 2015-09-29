import expect from 'expect';
import AvengerCache from '../../src/AvengerCache';
import { hashedParams } from '../../src/AvengerCache';

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

describe('cache', () => {

  describe('hashedParams', () => {

    it('should work for allowed param types', () => {
      const hashed = hashedParams({
        q2: 'foo',
        q1: true
      });
      expect(hashed).toBe('q1:true-q2:foo');
    });

    it('should be sort of deterministic', () => {
      expect(hashedParams({
        q2: 42.1,
        q1: false
      })).toBe(hashedParams({
        q1: false,
        q2: 42.1
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

});
