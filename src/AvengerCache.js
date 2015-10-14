// a cache implementation able to produce an ActualizedCache
// ... assuming for now each param is a primitive with meaningful toString()
// (i.e.: strings, numbers and bools)

import debug from 'debug';
import t from 'tcomb';
import { State } from './types';

const log = debug('AvengerCache');

export function hashedParams(params) {
  if (process.env.NODE_ENV !== 'production') {
    State(params);
  }
  const keys = Object.keys(params);
  keys.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const hashed = keys.map(k1 => `${k1}:${params[k1]}`).join('-');
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
    if (process.env.NODE_ENV !== 'production') {
      t.assert(State.is(params), `Invalid params provided to cache: ${JSON.stringify(params)}`);
    }
  }

  has(id, params) {
    this.checkParams(params);

    if (!this.state[id]) {
      return false;
    }

    return typeof this.state[id][hashedParams(params)] !== 'undefined';
  }

  get(id, params) {
    this.checkParams(params);

    if (!this.state[id]) {
      return null;
    }

    return this.state[id][hashedParams(params)] || null;
  }

  set = (id, params) => value => {
    this.checkParams(params);

    const hp = hashedParams(params);
    log(`set ${id} ${hp} = %o`, params, value);
    log(`current ${id} %o, ${id}[${hp}] (missing id: ${!this.state[id]})`, this.state[id], this.state[id] ? this.state[id][hp] : undefined);

    if (!this.state[id]) {
      this.state[id] = {};
    }

    this.state[id][hp] = value;
  };

  invalidate = (id, params) => {
    this.checkParams(params);

    if (this.state[id]) {
      const hp = hashedParams(params);
      delete this.state[id][hp];
    }
  };
}
