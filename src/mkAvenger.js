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
import { Query, Queries, State } from './types';

const log = debug('Avenger');

// const filterState = (node: GraphNode, state: ?t.Object) => { // : t.Object
//   const params = node.query.params;
//   if (params) {
//     t.struct(params)(state); // assert
//     return pick(state, Object.keys(params));
//   } else {
//     return t.Object(state);
//   }
// };

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

function fetch({ query, params }) { // Observable<queryFetchReturnType>
  if (query.params) {
    t.struct(query.params, `${query.id}:FetchParams`)(params); // assert
  }
  return Rx.Observable.fromPromise(query.fetch(params));
}

const Sources = t.dict(t.String, t.Any, 'Sources');



function _getSource(source: t.String, mkSource: t.Function, sources: Sources, query: Query, params/*: ?State*/ = {}) { // Observable<queryState>
  const k = instanceId(query.id, params);
  if (sources[source][k]) {
    return sources[source][k];
  } else {
    const s = mkSource(sources, query, params); // eslint-disable-line no-use-before-define
    sources[source][k] = s;
    return s;
  }
}



function createSource(sources: Sources, query: Query, params: State) { // Observable<queryState>
  if (!query.dependencies || Object.keys(query.dependencies).length === 0) {
    // query with no deps
    return new Rx.BehaviorSubject({ query, params });
  }

  // query with deps
  const observableDeps = map(query.dependencies, ({ query, map }, key) => {
    return getValue(sources, query, params).map(value => ({
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
}

function getSource(sources, query, params) {
  return _getSource('source', createSource, sources, query, params);
}



function createValue(sources: Sources, query: Query, params: State) {
  const fetcher = getSource(sources, query, params).flatMap(fetch);
  const isCacheable = ['optimistic', 'manual'].indexOf(query.cacheStrategy) !== -1;
  if (isCacheable) {
    const value = new Rx.BehaviorSubject(undefined);
    fetcher.subscribe(::value.next);
    return value;
  } else {
    // TODO(gio):
    // should instead have a subject, but valid in a window/buffer.
    // this way (current) every requester even in same frame or close frames
    // will throw away previous values
    return fetcher;
  }
}

function getValue(sources, query, params) {
  return _getSource('value', createValue, sources, query, params);
}



function getValueAndMaybeInvalidate(sources, query, params) {
  const value = getValue(sources, query, params);
  // TODO(gio):
  // should invalidate the dependency leaves here
  // in fact, non-leaves are just observables not subjects - cannot .next() (and it makes sense)
  // if (query.cacheStrategy === 'optimistic' && typeof value.getValue() !== 'undefined') {
    // setTimeout(() => {
    //   console.log('-- invalidate', query.id);
    //   // invalidate
    //   const source = getSource(sources, query, params);
    //   source.next(source.value);
    // });
  // }
  return value;
}


export default function mkAvenger(universe: Queries) {
  const sources = {
    source: {}, value: {}
  };

  const QueriesDict = t.dict(t.String, State);

  const addQueries = (queries: QueriesDict) => {
    const qs = map(queries, (params, id) => ({ id, params }));
    return Rx.Observable.combineLatest(
      qs.map(({ params, id }) => getValueAndMaybeInvalidate(sources, universe[id], params))
    ).map(values => values.reduce((ac, v, i) => ({
      ...ac, [qs[i].id]: v
    }), {}));
  };

  return {
    addQueries,
    addQuery(id: t.String, params: State) {
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
