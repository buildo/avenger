import t from 'tcomb';
import EventEmitter3 from 'eventemitter3';
import { AvengerInput, Command, EmitMeta } from './types';
import AvengerCache from './AvengerCache';
import build from './build';
import { runLocal } from './run';
import { invalidateLocal } from './invalidate';

export { Query, Command } from './types';

export default class Avenger {
  constructor(allQueries, initialCacheState = {}) {
    if (process.env.NODE_ENV !== 'production') {
      t.assert(AvengerInput.is(allQueries), `Invalid allQueries`);
    }

    this.allQueries = allQueries;
    this.currentInput = null;
    this.cache = new AvengerCache(initialCacheState);
    this.emitter = new EventEmitter3();
    this.result = {
      __meta: {}
    };
  }

  on(...args) {
    return this.emitter.on(...args);
  }

  off(...args) {
    return this.emitter.off(...args);
  }

  emit = (meta, value) => {
    if (process.env.NODE_ENV !== 'production') {
      EmitMeta(meta);
    }

    const {
      id,
      cache = false,
      error = false,
      multi = false,
      multiAll = false,
      loading = false
    } = meta;
    const now = new Date().getTime();
    const { cache: currentCache } = this.result.__meta[id] || {};

    if (error) {
      // TODO(gio): should also update __meta
      // and emit a `change`
      this.emitter.emit('error', value);
      return;
    }

    if (multi && !multiAll) {
      // not sure about this,
      // but seems easier to just emit once
      // with entire result change for multi queries
      return;
    }

    // TODO(gio): we should make sure not to
    // throw away valid refs here...
    if (value) {
      this.result[id] = value;
    }

    this.result.__meta[id] = {
      timestamp: now,
      cache,
      loading,
      error: false
    };

    this.emitter.emit('change', {
      ...this.result
    });
  };

  run(input, state) {
    // TODO(gio): not handling remote version for now

    const built = build(input, this.allQueries);

    // cleanup current result..
    this.result = Object.keys(built || {})
      .map(k => built[k])
      .reduce((ac, { query: { id } }) => ({
        ...ac,
        [id]: this.result[id],
        __meta: {
          ...ac.__meta,
          [id]: this.result.__meta[id]
        }
      }), {});

    return runLocal({
      input: built,
      oldInput: this.currentInput,
      state,
      cache: this.cache,
      emit: this.emit
    }).then(res => {
      this.currentInput = built;
      return res;
    }, err => {
      throw err;
    });
  }

  invalidate(state, invalidate) {
    // TODO(gio): not handling remote version for now

    const { __meta, ...result } = this.result;

    return invalidateLocal({
      invalidate,
      input: this.currentInput,
      result,
      state,
      cache: this.cache,
      emit: this.emit
    });
  }

  // there should also be a way to track subsequent invalidation
  // e.g. `runCommandAndThenWaitForSubsequentInvalidation`
  // or this could be built on top of emit if we add a `stable` event
  runCommand(state, command) {
    // TODO(gio): not handling remote version for now

    if (process.env.NODE_ENV !== 'production') {
      Command(command);
    }

    return command.run(state).then(res => {
      this.invalidate(
        state,
        command.invalidates
      );
      return res;
    }, err => {
      throw err;
    });
  }

  // runToRecipe(input, state) {
  //   // TODO(gio)
  //   // should serialize to recipe
  //   // recipe should contain: old input, new input, state, minCache
  // }

  // runFromRecipe(recipe) {
  //   // TODO(gio)
  //   // should deserialize recipe and run
  // }
}
