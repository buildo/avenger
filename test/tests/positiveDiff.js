import expect from 'expect';
import queries from '../fixtures/queries';
import build from '../../src/build';
import positiveDiff from '../../src/positiveDiff';

const { A, B, C, D, E, F, G, H } = queries();
const all = { A, B, C, D, E, F, G, H };

describe('positiveDiff', () => {
  it('should just work', () => {
    const first = build({ G }, all);
    const second = build({ E, H }, all);
    const diff = positiveDiff(second, first);

    expect(diff.A).toBe('=');
    expect(diff.B).toBe('=');
    expect(diff.C).toBe('+');
    expect(diff.D).toBe('=');
    expect(diff.E).toBe('+');
    expect(diff.F).toBe('=');
    expect(diff.H).toBe('+');
  });

});
