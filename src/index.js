require('./util');

import assert from 'better-assert';
import t from 'tcomb';
import Query from './Query';

export const AvengerInput = t.list(t.struct({
  query: Query
}));

export function upset(avengerInput) {
  assert(AvengerInput.is(avengerInput));

  const res = {};
  function _upset(input) {
    input.map((q) => {
      res[q.name] = q;
      if (!! q.dependencies) {
        _upset(q.dependencies.map((d) => d.query));
      }
    });
  }
  _upset(avengerInput.map((i) => i.query));
  return res;
}
