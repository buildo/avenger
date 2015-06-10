import t from 'tcomb';
import AvengerInput from './AvengerInput';

// export for tests
export function upset(avengerInput) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
  }

  const res = {};
  function _upset(input) {
    input.map((q) => {
      res[q.id] = q;
      if (q.dependencies) {
        _upset(q.dependencies.map((d) => d.query));
      }
    });
  }
  _upset(avengerInput.map((i) => i.query));
  return Object.keys(res).map((k) => res[k]);
}

export function actualizeParameters(avengerInput) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
  }

  return upset(avengerInput).map((query) => {
    const ai = avengerInput.filter((i) =>
      i.query === query
    )[0];
    const params = ai ? ai.params : {};
    return {
      id: query.id,
      query: query,
      fetcher: query.fetch(params)
    };
  });
}