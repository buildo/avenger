import t from 'tcomb';
import { QueryNodes, State } from './types';

const PositiveDiffParams = t.struct({
  a: QueryNodes,
  b: t.maybe(QueryNodes),
  aState: t.maybe(State),
  bState: t.maybe(State)
}, 'PositiveDiffParams');

export default function positiveDiff(params: PositiveDiffParams) {
  const {
    a, b, aState, bState
  } = params;

  const stateDiff = (a, b, query) => {
    const relevantKeys = query.cacheParams ? Object.keys(query.cacheParams) : Object.keys(a);
    return relevantKeys.reduce((ac, k) => ac || a[k] !== b[k], false);
  };

  return Object.keys(a).reduce((ac, nk) => ({
    ...ac,
    [nk]: !(b || {})[nk] || stateDiff(aState || {}, bState || {}, a[nk].query)
  }), {});
}
