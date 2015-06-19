// a cache implementation able to produce an ActualizedCache
// ... assuming for now each param is a primitive with meaningful toString()
// (i.e.: strings, numbers and bools)

import t from 'tcomb';

const AllowedParam = t.subtype(t.Any, p => {
  return t.Str.is(p) || t.Num.is(p) || t.Bool.is(p);
}, 'AllowedParam');
const AllowedParams = t.dict(t.Str, t.dict(t.Str, AllowedParam, 'AllowedParams'));

export function hashedParams(params) {
  if (process.env.NODE_ENV !== 'production') {
    AllowedParams(params);
  }
  const keys = Object.keys(params);
  keys.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const hashed = keys.map((k1) => {
    const childkeys = Object.keys(params[k1]);
    childkeys.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    return childkeys.map(k2 => `${k1}.${k2}:${params[k1][k2]}`).join('-');
  }).join('-');
  return hashed ? hashed : '∅';
}

export default class AvengerCache {

  constructor(initialState = {}) {
    this.state = initialState;
  }

  toJSON() {
    return this.state;
  }

  checkParams(params) {
    return AllowedParams.is(params);
  }

  get(id, params) {
    if (process.env.NODE_ENV !== 'production') {
      this.checkParams(params);
    }

    if (!this.state[id]) {
      return null;
    }

    return this.state[id][hashedParams(params)] || null;
  }

  set = (id, params) => value => {
    if (process.env.NODE_ENV !== 'production') {
      this.checkParams(params);
    }

    if (!this.state.id) {
      this.state[id] = {};
    }

    this.state[id][hashedParams(params)] = value;
  };

  // actualize(queries) {
  //   if (process.env.NODE_ENV !== 'production') {
  //     AvengerInputActualizedQueries(queries);
  //   }

  //   return queries.reduce((ac, { query, params = {} }) => {
  //     const value = this.get(query.id, params);
  //     return value === null ? ac : assign(ac, {
  //       [query.id]: {
  //         value,
  //         set: this.set(query.id, params)
  //       }
  //     });
  //   }, {});
  // }
}
