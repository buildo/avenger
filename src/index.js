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

  return upset(avengerInput).map((query) => {
    const params = avengerInput.filter((i) =>
      i.query == query
    )[0];
    return {
      name: query.name,
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
      if (! c.promise) {
        console.log('considering ' + c.query.name);
        // must be in order
        //console.log(c.query.dependencies.map((q) => q.query.name));
        const dependentPrepareds =
          ps.filter((p) => c.query.dependencies && (c.query.dependencies.map((q) => q.query.name).indexOf(p.query.name) != -1));
        console.log(dependentPrepareds);
        _schedule(dependentPrepareds);
        const names = dependentPrepareds.map((p) => p.query.name);
        const promises = dependentPrepareds.map((p) => p.promise);
        const fetchParams = dependentPrepareds.map((p) =>
            c.query.dependencies.filter((d) => d.query == p.query)[0].fetchParams);
        const gnam = {};
        const mang = {};
        for (var i = 0; i < names.length; i++) {
          gnam[names[i]] = promises[i];
          mang[names[i]] = fetchParams[i];
        }
        console.log('scheduling ' + c.query.name);
        c.promise = Promise.allValues(gnam).then((fetchResults) =>
          c.fetcher(Object.keys(fetchResults).map((frk) => {
            mang[frk](fetchResults[frk])
          }))[0]
        );
      }
      return c.promise;
    });
  }

  return Promise.all(_schedule(ps));
}
