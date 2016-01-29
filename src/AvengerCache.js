import debug from 'debug';
import t from 'tcomb';
import { State, CacheState } from './types';

const log = debug('AvengerCache');

export function hashedParams(params: State): t.Str {
  const keys = Object.keys(params);
  keys.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const hashed = keys.map(k1 => `${k1}:${JSON.stringify(params[k1])}`).join('-');
  return hashed ? hashed : '∅';
}

export default class AvengerCache {

  constructor(initialState: ?CacheState) {
    this.state = initialState || {};
  }

  toJSON(): CacheState {
    return this.state;
  }

  has(id: t.String, params: State): t.Boolean {
    if (!this.state[id]) {
      return false;
    }

    return typeof this.state[id][hashedParams(params)] !== 'undefined';
  }

  get(id: t.String, params: State): t.Any {
    if (!this.state[id]) {
      return null;
    }

    return this.state[id][hashedParams(params)] || null;
  }

  set = (id: t.String, params: State) => (value: t.Any) => {
    const hp = hashedParams(params);
    log(`set ${id} ${hp} = %o`, params, value);
    log(`current ${id} %o, ${id}[${hp}] (missing id: ${!this.state[id]})`, this.state[id], this.state[id] ? this.state[id][hp] : undefined);

    if (!this.state[id]) {
      this.state[id] = {};
    }

    this.state[id][hp] = value;
  };

  unset = (id: t.String, params: State) => {
    if (this.state[id]) {
      const hp = hashedParams(params);
      delete this.state[id][hp];
    }
  };
}
