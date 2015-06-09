import { allValues } from './util';

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
  assert(AvengerInput.is(avengerInput));

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

export function schedule(avengerInput) {
  assert(AvengerInput.is(avengerInput));

  const ps = actualizeParameters(avengerInput);
  console.log(ps);

  function _schedule(curr) {
    return curr.map((c) => {
      if (!c.promise) {
        console.log('considering ' + c.query.name);
        const dependentPrepareds = (c.query.dependencies || []).map((d) =>
          ps.filter((p) => p.query.id === d.query.id)[0])
        console.log(dependentPrepareds);
        _schedule(dependentPrepareds);
        const ids = dependentPrepareds.map((p) => p.query.id);
        const promises = dependentPrepareds.map((p) => p.promise);
        const fetchParams = dependentPrepareds.map((p) =>
            c.query.dependencies.filter((d) => d.query === p.query)[0].fetchParams);
        const gnam = {};
        const mang = {};
        for (var i = 0; i < ids.length; i++) {
          gnam[ids[i]] = promises[i];
          mang[ids[i]] = fetchParams[i];
        }
        console.log('scheduling ' + c.query.id);
        c.promise = allValues(gnam).then((fetchResults) => {
          console.log('!!', fetchResults);
          const fetcherParams = Object.keys(fetchResults).map((frk) =>
            mang[frk](fetchResults[frk])
          );
          console.log('FETCHER', fetcherParams);
          return allValues(c.fetcher(...fetcherParams));
        });
      }
      return c.promise;
    });
  }

  return Promise.all(_schedule(ps));
}
