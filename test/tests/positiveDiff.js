import expect from 'expect';
import queries from '../fixtures/queries';
import build from '../../src/build';
import positiveDiff from '../../src/positiveDiff';

describe('positiveDiff', () => {
  const { A, B, C, D, E, F, G, H } = queries();
  const all = { A, B, C, D, E, F, G, H };

  it('should just work', () => {
    const first = build({ G }, all);
    const second = build({ E, H }, all);
    const diff = positiveDiff(second, first);

    expect(diff).toEqual({
      A: false, B: false, C: true, D: false, E: true, F: false, H: true
    });
  });

  it('should work positively only', () => {
    const first = build({ B }, all);
    const second = build({ C }, all);
    const diff = positiveDiff(second, first);

    expect(diff).toEqual({
      A: false, C: true
    });
  });

});
