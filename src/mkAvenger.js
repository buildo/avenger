import t from 'tcomb';
import Rx from 'rxjs/Rx';
import debug from 'debug';
// import mapValues from 'lodash/object/mapValues';
import map from 'lodash/collection/map';
import every from 'lodash/collection/every';
// import uniq from 'lodash/array/uniq';
// import intersection from 'lodash/array/intersection';
// import pick from 'lodash/object/pick';
import identity from 'lodash/utility/identity';
import _memoize from 'lodash/function/memoize';
import partialRight from 'lodash/function/partialRight';
import { Query, Queries, State } from './types';

const log = debug('Avenger');

// const stateEqual = (a: ?t.Object, b: ?t.Object) => { // t.Boolean
//   if (!a && !b) { return true; }
//   if ((!a || !b) && a !== b) { return false; }
//   const aKeys = Object.keys(a);
//   const bKeys = Object.keys(b);
//   if (aKeys.length !== bKeys.length) { return false; }
//   for (let i = 0; i < aKeys.length; i++) {
//     if (a[aKeys[i]] !== b[aKeys[i]]) { return false; }
//   }
//   return true;
// };

const instanceId = (id: t.String, params: State)/*: t.String*/ => `${id}-${JSON.stringify(params)}`;
const memoize = partialRight(_memoize, (query, params) => instanceId(query.id, params));

function fetch({ query, params }) {
  if (query.params) {
    t.struct(query.params, `${query.id}:FetchParams`)(params); // assert
  }
  return Rx.Observable.fromPromise(query.fetch(params));
}

const getSource = memoize((query: Query, params: State) => {
  if (!query.dependencies || Object.keys(query.dependencies).length === 0) {
    // query with no deps
    return new Rx.BehaviorSubject({ query, params });
  }

  // query with deps
  const observableDeps = map(query.dependencies, ({ query, map }, key) => {
    return getValue(query, params).map(value => ({
      value, key, map: map || identity
    }));
  });
  return Rx.Observable.combineLatest(...observableDeps)
    .filter(deps => every(deps, d => typeof d.value !== 'undefined'))
    .map(deps => deps.map(({ value, key, map }) => ({ value: map(value), key })))
    .map(deps => ({
      query,
      params: {
        ...params,
        ...deps.reduce((ac, { key, value }) => ({
          ...ac, [key]: value
        }), {})
      }
    }));
});

const getValue = memoize((query: Query, params: State) => {
  const fetcher = getSource(query, params).flatMap(v => {
    const readyState = getReadyState(query, params);
    readyState.next({ ...readyState.value, waiting: false, fetching: true });
    return fetch(v).do(() => {
      readyState.next({ ...readyState.value, fetching: false });
    });
  });
  const isCacheable = ['optimistic', 'manual'].indexOf(query.cacheStrategy) !== -1;
  if (isCacheable) {
    const value = new Rx.BehaviorSubject(undefined);
    fetcher.subscribe(::value.next);
    return value;
  } else {
    // TODO(gio):
    // should instead have a subject, but valid in a window/buffer.
    // this way (current) every requester even in same frame or close frames
    // will throw away previous values ?
    return fetcher;
  }
});

const getReadyState = memoize((query: Query, params: State) => {
  return new Rx.BehaviorSubject({ waiting: true, fetching: false });
});


function invalidateUpset(query, params, force = false) {
  const deps = query.dependencies;
  // should invalidate only the leaves here. in fact, non-leaves are
  // just observables not subjects -> cannot .next() (and it makes sense)
  if (deps && Object.keys(deps).length > 0) {
    // sync-wait a possibly non-free query
    const rs = getReadyState(query, params);
    if (!rs.value.waiting) {
      rs.next({ ...rs.value, waiting: true });
    }

    map(deps, ({ query }) => invalidateUpset(query, params));
  } else if (force || query.cacheStrategy !== 'manual') {
    const value = getValue(query, params);
    if (typeof value.value !== 'undefined') {
      // be sure to allow for a sync value if there's one
      setTimeout(() => {
        const source = getSource(query, params);
        // invalidate
        source.next(source.value);
      });
    }
  }
}

function getValueAndMaybeInvalidateUpset(query, params) {
  invalidateUpset(query, params, false);
  return getValue(query, params);
}


export default function mkAvenger(universe: Queries) {
  const QueriesDict = t.dict(t.String, State);

  const addQueries = (queries: QueriesDict) => {
    const qs = map(queries, (params, id) => ({ id, params }));
    const value = Rx.Observable.combineLatest(
      qs.map(({ params, id }) => getValueAndMaybeInvalidateUpset(universe[id], params))
    ).map(values => values.reduce((ac, v, i) => ({
      ...ac, [qs[i].id]: v
    }), {}));
    const readyState = Rx.Observable.combineLatest(
      qs.map(({ params, id }) => getReadyState(universe[id], params))
    ).map(rses => rses.reduce((ac, rs, i) => ({
      ...ac, [qs[i].id]: rs
    }), {}));
    return Rx.Observable.combineLatest([value, readyState]).debounceTime(0).map(([val, rs]) => ({
      ...val,
      readyState: rs
    }));
  };

  return {
    addQueries,
    addQuery(id: t.String, params: ?State) {
      return addQueries({ [id]: params });
    }
  };
  // return {
    // $graph: sink,
    // $value,
    // $readyState,
    // $stableValue: $activeGraph.filter(g => {
    //   const readyState = extractReadyState(g);
    //   return Object.keys(readyState)
    //     .map(k => readyState[k].loading)
    //     .reduce((ac, loading) => ac && !loading, true);
    // }).map(extractValue),
    // addQuery(id: t.String) {
    //   return addQueries([id]);
    // },
    // addQueries,
    // removeQuery(id: t.String) {
    //   return removeQueries([id])
    // },
    // removeQueries,
    // invalidateQuery(id: t.String) {
    //   return invalidateQueries([id]);
    // },
    // invalidateQueries,
    // setState(s: t.Object) {
    //   log(`setState  ${JSON.stringify(s)}`);
    //   state.next(s);
    // },
    // runCommand(cmd: Command) {
    //   const { run, invalidates } = cmd;
    //   return run().then(() => invalidateQueries(Object.keys(invalidates || {})));
    // }
  // }
}
