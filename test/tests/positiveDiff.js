import expect from 'expect';
import queries from '../fixtures/queries';
import build from '../../src/build';
import positiveDiff from '../../src/positiveDiff';

describe('positiveDiff', () => {
  const { A, B, C, D, E, F, G, H, M, N, O } = queries();
  const all = { A, B, C, D, E, F, G, H, M, N, O };

  it('should just work', () => {
    const b = build({ G }, all);
    const a = build({ E, H }, all);
    const diff = positiveDiff({ a, b });

    expect(diff).toEqual({
      A: false, B: false, C: true, D: false, E: true, F: false, H: true
    });
  });

  it('should work positively only', () => {
    const b = build({ B }, all);
    const a = build({ C }, all);
    const diff = positiveDiff({ a, b });

    expect(diff).toEqual({
      A: false, C: true
    });
  });

  it('should consider query-relevant state if provided', () => {
    const a = build({ B }, all);
    const b = a;
    const bState = { s1: 'bar' };
    const aState = { s1: 'baz' };
    const diff = positiveDiff({ a, b, aState, bState });

    expect(diff).toEqual({
      A: true, B: true, F: true
    });
  });

  it('should consider query-relevant state if provided 2', () => {
    const a = build({ C }, all);
    const b = a;
    const bState = { s1: 'bar' };
    const aState = { s1: 'baz' };
    const diff = positiveDiff({ a, b, aState, bState });

    expect(diff).toEqual({
      A: true, C: false
    });
  });

  it('should consider query-relevant state if provided 3', () => {
    const a = build({ N, O }, all);
    const b = a;
    const bState = { a: 'a', n: 'n', o: 'o' };
    const aState = { ...bState, a: 'a1' };
    const diff = positiveDiff({ a, b, aState, bState });

    expect(diff).toEqual({
      M: true, N: false, O: false
    });
  });

});
