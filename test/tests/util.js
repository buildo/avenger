import expect from 'expect';
import { allValues } from '../../src/util';

describe('allValues', () => {
  it('should do its magic', done => {
    allValues({
      asdf: Promise.resolve(12),
      qwer: Promise.resolve(24)
    }).then((res) => {
      expect(res).toEqual({
        asdf: 12,
        qwer: 24
      });
      done();
    }).catch(e => { throw e; });
  });
});
