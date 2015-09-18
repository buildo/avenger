import t from 'tcomb';
import { QueryNodes } from './types';

export default function positiveDiff(a, b) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(QueryNodes.is(QueryNodes(a)), `Invalid a provided to diff`);
    t.assert(t.maybe(QueryNodes).is(t.maybe(QueryNodes)(b)), `Invalid b provided to diff`);
  }

  // degenerate case: first tree is being diffed against nil
  if (!b) {
    b = {};
  }

  return Object.keys(a).reduce((ac, nk) => ({
    ...ac,
    [nk]: !b[nk] ? '+' : '='
  }), {});
}
