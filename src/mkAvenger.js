import t from 'tcomb';
import Rx from 'rxjs/Rx';
import debug from 'debug';
import uniq from 'lodash/array/uniq';
import intersection from 'lodash/array/intersection';
import { Action, Graph, GraphNode } from './types';
import AvengerCache from './AvengerCache';

const log = debug('Avenger');

const buildInitialGraph = (universe: t.Object): Graph => Object.keys(universe).reduce((ac, k) => Graph({
  ...ac,
  [k]: { query: universe[k], timestamp: Date.now() }
}), Graph({}));

const patchNodes = (graph: Graph, ks: Array<t.String>, patch: t.Object|Array<t.Object>) => { //: Graph
  const _g = { ...graph };
  ks.forEach((k, i) => {
    const p = t.Object.is(patch) ? patch : patch[i];
    if (p.timestamp) { throw new Error('cannot patch with a timestamp'); }
    _g[k] = { ..._g[k],  ...p, timestamp: Date.now() };
  });
  return _g;
};

const patchNode = (graph: Graph, k: t.String, patch: t.Object) /*: Graph*/ => patchNodes(graph, [k], patch);

const reducers = {

  removeQueries: (graph, ids) => patchNodes(graph, ids, {
    active: false, waiting: false
  }),

  addQueries: (graph, ids) => patchNodes(graph, ids, {
    active: true, invalid: true // TODO(gio): `null` (and `undefined`?) are valid values. Should add `.hasValue` or similar to invalidate conditionally?
  }),

  setWaitingQueries: (graph, ids) => patchNodes(graph, ids, {
    waiting: true
  }),

  setFetchingQueriesAndLastState: (graph, { ids, states }) => patchNodes(graph, ids, states.map(s => ({
    waiting: false, fetching: true, invalidFetching: false, lastState: s
  }))),

  setInvalidQueries: (graph, ids) => patchNodes(graph, ids, {
    invalid: true
  }),

  setInvalidFetchingQueries: (graph, ids) => patchNodes(graph, ids, {
    invalidFetching: true
  }),

  setValue: (graph, { id, value, fromCache, invalid }) => patchNode(graph, id, {
    fetching: false, waiting: false, error: null,
    invalid, value, fromCache
  }),

  setError: (graph, { id, error }) => patchNode(graph, id, {
    fetching: false, waiting: false, invalid: true, error
  })

};


const nodeIsFree = (graph: Graph) => (node: GraphNode): t.Boolean => {
  const deps = node.query.dependencies || {};
  const keys = Object.keys(deps);
  for (let i = 0; i < keys.length; i++) {
    const { value, invalid, fromCache } = graph[deps[keys[i]].query.id];
    if (typeof value === 'undefined' || (invalid && !fromCache)) {
      return false;
    }
  }
  return true;
};

const nodeIsMissingDependencies = (graph: Graph) => (node: GraphNode): t.Boolean => {
  const deps = node.query.dependencies || {};
  const keys = Object.keys(deps);
  for (let i = 0; i < keys.length; i++) {
    if (!graph[deps[keys[i]].query.id].active) {
      return true;
    }
  }
  return false;
};

const nodeIsFetching = (node: GraphNode): t.Boolean => {
  return !!node.fetching;
};

const depsStateAndState = (graph: Graph, node: GraphNode, state: ?t.Object) => { // : t.Object
  const deps = node.query.dependencies || {};
  const depsState = Object.keys(deps).reduce((ac, k) => {
    const { value, invalid, fromCache } = graph[deps[k].query.id];
    if (typeof value === 'undefined' || (invalid && !fromCache)) {
      throw new Error('trolo');
    }
    return { ...ac, [k]: value };
  }, {});
  if (intersection(Object.keys(depsState), Object.keys(state)).length > 0) {
    throw new Error('trolo');
  }
  return { ...state, ...depsState };
};

const filterState = (node: GraphNode, state: ?t.Object) => { // : t.Object
  const params = node.query.params;
  const paramsFilter = !params ? t.Object : t.struct(params);
  return paramsFilter(state);
};

const stateEqual = (a: ?t.Object, b: ?t.Object) => { // t.Boolean
  if (!a && !b) { return true; }
  if ((!a || !b) && a !== b) { return false; }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) { return false; }
  for (let i = 0; i < aKeys.length; i++) {
    if (a[aKeys[i]] !== b[aKeys[i]]) { return false; }
  }
  return true;
};

// TODO(gio): what is this?
// it is called loop because it gives av internals the possibilty
// to loop back into internals again (sync) before notifying the user
// the order of actions dispatched (returned) obv. matters
// we should define high level invariants after each step
// to make it clear what each optional dispatch is for
const loop = (graph: Graph, state: t.Object, cache: t.Any /* AvengerCache */, dispatch: t.Function) => { // : t.maybe(~Action)
  // set as invalid all free nodes with value but with lastState different from current one
  const nodesToStateInvalidate = Object.keys(graph)
    .filter(k => nodeIsFree(graph)(graph[k]))
    .filter(k => !graph[k].invalid)
    .filter(k => {
      const allState = depsStateAndState(graph, graph[k], state);
      return !stateEqual(graph[k].lastState, filterState(graph[k], allState))
    });
  if (nodesToStateInvalidate.length > 0) {
    return {
      type: 'setInvalidQueries', data: nodesToStateInvalidate
    };
  }

  // set as invalid all non fetching queries with value and invalid queries as deps
  const nodesToInvalidate = Object.keys(graph)
    .filter(k => !graph[k].invalid)
    .filter(k => !nodeIsFree(graph)(graph[k]));
  if (nodesToInvalidate.length > 0) {
    return {
      type: 'setInvalidQueries', data: nodesToInvalidate
    };
  }

  // mark as invalidFetch all fetching with invalid queries as deps
  const nodesInInvalidFetching = Object.keys(graph)
    .filter(k => graph[k].fetching && !graph[k].invalidFetching)
    .filter(k => !nodeIsFree(graph)(graph[k]));
  if (nodesInInvalidFetching.length > 0) {
    return {
      type: 'setInvalidFetchingQueries', data: nodesInInvalidFetching
    };
  }

  // mark all active and not yet fetching queries as 'waiting'
  const nodesThatShouldBeWaiting = Object.keys(graph)
    .filter(k => {
      const { active, waiting, fetching, value, invalid } = graph[k];
      return !!(active && !waiting && (typeof value === 'undefined' || invalid) && !fetching);
    });
  if (nodesThatShouldBeWaiting.length > 0) {
    return {
      type: 'setWaitingQueries', data: nodesThatShouldBeWaiting
    };
  }


  const markAsFetched = (dispatch: t.Function, queryId: t.String, fromCache: t.Boolean) /*: t.Function */ => (result: t.Any) => {
    const optimisticFromCache = fromCache && graph[queryId].query.cacheStrategy === 'optimistic';
    const invalid = graph[queryId].invalidFetching || !graph[queryId].active || optimisticFromCache;
    dispatch({
      type: 'setValue', data: {
        id: queryId, value: result, fromCache, invalid
      }
    });
    if (optimisticFromCache) {
      dispatch({
        type: 'setInvalidQueries', data: [queryId]
      });
    }
  };

  const markAsErrored = (dispatch: t.Function, queryId: t.String) /*: t.Function */ => (error: t.Any) => {
    dispatch({
      type: 'setError', data: { id: queryId, error }
    });
  };

  // fetch() and mark as fetching free nodes that should be fetched
  const nodesThatShouldBeFetching = Object.keys(graph)
    .filter(k => graph[k].active && graph[k].waiting)
    .filter(k => nodeIsFree(graph)(graph[k]))
    .filter(k => !nodeIsFetching(graph[k]));
  const states = nodesThatShouldBeFetching.map(k => filterState(graph[k], depsStateAndState(graph, graph[k], state)));
  nodesThatShouldBeFetching.forEach((k, i) => {
    const node = graph[k];
    const isCacheable = node.query.cacheStrategy && node.query.cacheStrategy !== 'no';
    let cached;
    if (isCacheable && !node.fromCache) {
      cached = cache.get(k, states[i]);
      if (cached) {
        const fromCache = true;
        markAsFetched(dispatch, k, fromCache)(cached);
      }
    }
    if (!isCacheable || !cached) {
      node.query.fetch(states[i])
        .then(
          v => {
            cache.set(k, states[i], v);
            markAsFetched(dispatch, k, false)(v);
            return v;
          },
          markAsErrored(dispatch, k)
        ).catch(err => {
          console.error(`fetch Promise mangled:`, err);
      });
    }
  });

  if (nodesThatShouldBeFetching.length > 0) {
    return {
      type: 'setFetchingQueriesAndLastState', data: {
        ids: nodesThatShouldBeFetching,
        states
      }
    }
  }

  // bring in missing dependencies for non-free queries
  const nonFreeNodes = Object.keys(graph)
    .filter(k => graph[k].active && graph[k].waiting)
    .filter(k => nodeIsMissingDependencies(graph)(graph[k]));

  const queriesToAdd = uniq(nonFreeNodes
    .map(k => {
      const deps = graph[k].query.dependencies;
      return Object.keys(deps || {}).map(k => deps[k].query.id);
    })
    .reduce((ac, depsIds) => ac.concat(depsIds), [])
  );

  if (queriesToAdd.length > 0) {
    return {
      type: 'addQueries', data: queriesToAdd
    }
  }
};

export default function mkAvenger(universe: t.Object) {
  const state = new Rx.BehaviorSubject({});
  const source = new Rx.Subject();
  const sink = new Rx.Subject();
  const cache = new AvengerCache();

  const initialGraph = buildInitialGraph(universe);
  const dispatch = (_action: t.Object) => {
    const action = Action(_action);
    log(`dispatch  ${action.type}  ${JSON.stringify(action.data)}`);
    source.next(action);
  };

  const $graph = source.scan(
    (graph, { type, data }) => Graph(reducers[type](graph, data)),
    initialGraph
  );

  $graph.combineLatest(state).subscribe(([graph, state]) => {
    const asyncDispatch = (...args) => {
      setTimeout(() => {
        dispatch(...args);
      });
    };
    const loopAction = loop(graph, state, cache, asyncDispatch);

    if (loopAction) {
      dispatch(loopAction);
    } else {
      sink.next(graph);
    }
  });

  const $activeGraph = sink.map(g => Object.keys(g).filter(k => g[k].active).reduce((ac, k) => ({
    ...ac, [k]: g[k]
  }), {}));

  const extractValue = g => Object.keys(g).reduce((ac, k) => ({
    ...ac, [k]: g[k].value
  }), {});

  const extractReadyState = g => Object.keys(g).reduce((ac, k) => {
    const { error, waiting, fetching } = g[k];
    return {
      ...ac, [k]: {
        loading: !!(waiting || fetching),
        error
      }
    };
  }, {});

  return {
    $graph: sink,
    $value: $activeGraph.map(extractValue),
    $readyState: $activeGraph.map(extractReadyState),
    $stableValue: $activeGraph.filter(g => {
      const readyState = extractReadyState(g);
      return Object.keys(readyState)
        .map(k => readyState[k].loading)
        .reduce((ac, loading) => ac && !loading, true);
    }).map(extractValue),
    addQuery(id: t.String) {
      dispatch({
        type: 'addQueries', data: [id]
      });
    },
    removeQuery(id: t.String) {
      dispatch({
        type: 'removeQueries', data: [id]
      });
    },
    invalidateQuery(id: t.String) {
      dispatch({
        type: 'setInvalidQueries', data: [id]
      });
    },
    setState(s: t.Object) {
      log(`setState  ${JSON.stringify(s)}`);
      state.next(s);
    }
  }
}
