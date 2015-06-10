import { allValues } from './util';

import t from 'tcomb';
import Query from './Query';
export Query from './Query';

export const AvengerInput = t.subtype(t.list(t.struct({
  query: Query,
  params: t.maybe(t.Obj)
})), list => list.length > 0, 'AvengerInput');

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

// export for tests
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

// export for tests
export function schedule(avengerInput) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(avengerInput));
  }

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

const FromJSONParams = t.struct({
  // TODO(gio) be more restrictive
  json: t.list(t.Any),
  allQueries: t.dict(t.Str, Query)
}, 'FromJSONParams');

export default class Avenger {

  static fromJSON(serialized) {
    const { json, allQueries } =  new FromJSONParams(serialized);

    const input = new AvengerInput(json.map(q => {
      if (process.env.NODE_ENV !== 'production') {
        t.assert(Object.keys(q).length === 1, `invalid format for query in: ${q}`);
      }
      const id = Object.keys(q)[0];
      if (process.env.NODE_ENV !== 'production') {
        t.assert(Query.is(allQueries[id]), `query not found: ${id}`);
      }
      return {
        query: allQueries[id],
        params: q[id]
      };
    }));

    return new Avenger(input);
  }

  constructor(input) {
    if (process.env.NODE_ENV !== 'production') {
      t.assert(AvengerInput.is(input), `invalid input`);
      t.assert(input.length > 0, `invalid input: empty set`);
    }
    this.input = input;
  }

  toJSON() {
    return this.input.map(avIn => ({
      [avIn.query.id]: avIn.params || {}
    }));
  }

  run() {
    return _schedule(this.input);
  }

}
