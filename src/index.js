require('./util');

import assert from 'better-assert';
import t from 'tcomb';
import Query from './Query';

export const AvengerInput = t.list(t.struct({
  query: Query,
  params: t.maybe(t.dict(t.Str, t.Any))
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
  return Object.keys(res).map((k) => res[k]);
}

export function actualizeParameters(avengerInput) {
  assert(AvengerInput.is(avengerInput));

  const all = upset(avengerInput).map((query) => {
    const params = avengerInput.filter((i) => {
      return i.query == query;
    });
    return {
      name: query.name,
      query: query,
      fetcher: query.fetch(params)
    };
  });

  return all;
}

// export function avenge(avengerInput) {
// 
// }
