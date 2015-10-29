import t from 'tcomb';
import EventEmitter3 from 'eventemitter3';
import { AvengerInput, State, CacheState, Command, EmitMeta, PromiseType } from './types';
import AvengerCache from './AvengerCache';
import build from './build';
import { runLocal } from './run';
import { invalidateLocal } from './invalidate';

export default class Avenger {
  constructor(allQueries: AvengerInput, initialCacheState: CacheState = {}) {
    this.allQueries = allQueries;
    this.currentInput = null;
    this.currentState = {};
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

  emit = (meta: EmitMeta, value: t.Any) => {
    const {
      id,
      loading = false,
      cache = false,
      error = false,
      multi = false,
      multiAll = false
    } = meta;
    const now = new Date().getTime();

    if (multi && !multiAll) { // swallow up!
      // not sure about this,
      // but seems easier to just emit once
      // with entire result change for multi queries
      return;
    }

    // TODO(gio): should value be the last valid value even if
    // last fetch caused an error?
    // error meta is anyway updated accordingly below
    if (!error) {
      // TODO(gio): we should make sure not to throw away
      // valid refs here... but as long as potentially reusable
      // values are from cache (memory), we should be safe
      this.result[id] = value;
    }

    this.result.__meta[id] = {
      timestamp: now,
      cache,
      loading,
      error: !!error
    };

    if (error) {
      this.emitter.emit('error', value);
    }

    this.emitter.emit('change', {
      ...this.result
    });
  };

  run(input: AvengerInput, state: State): PromiseType {
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
      oldState: this.currentState,
      cache: this.cache,
      emit: this.emit
    }).then(res => {
      this.currentInput = built;
      this.currentState = state;
      return res;
    }, err => {
      throw err;
    });
  }

  invalidate(state: State, _inv: AvengerInput): PromiseType {
    // TODO(gio): not handling remote version for now

    const { __meta, ...result } = this.result;

    return invalidateLocal({
      invalidate: _inv,
      input: this.currentInput,
      result,
      state,
      cache: this.cache,
      emit: this.emit
    });
  }

  // TODO(gio): there should also be a way to track subsequent invalidation
  // e.g. `runCommandAndThenWaitForSubsequentInvalidation`
  // or this could be built on top of emit if we add a `stable` event
  runCommand(state: State, command: Command): PromiseType {
    // TODO(gio): not handling remote version for now

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
