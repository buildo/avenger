import t from 'tcomb';
import _find from 'lodash/find';
import flatten from 'lodash/flatten';
import uniq from 'lodash/uniq';
import pick from 'lodash/pick';
import difference from 'lodash/difference';
import { apply } from '../query/apply';
import { ObservableCache } from '../query/ObservableCache';
import { refetch, Strategy } from '../cache/strategies';
import { cacheFetch } from '../query/operators';
import { compose, product } from '../fetch/operators';

const As = t.list(t.String, 'As');
const Fetch = t.Function; // <a1, ..., an> => Promise<Any>
const SimpleNode = t.refinement(t.interface({
  A: As, fetch: Fetch, strategy: t.maybe(Strategy)
}, { strict: true }), node => typeof node.fetch.type === 'undefined', 'SimpleNode');
const DerivateFetchType = t.enums.of(['product', 'composition'], 'DerivateFetchType');
const DerivateFetch = t.refinement(Fetch, f => DerivateFetchType.is(f.type), 'DerivateFetch');
const DerivateNode = t.interface({
  fetch: DerivateFetch, strategy: t.maybe(Strategy)
}, { name: 'DerivateNode', strict: true });
const Node = t.union([SimpleNode, DerivateNode], 'Node');
Node.dispach = node => t.match(node.fetch.type,
  t.String, DerivateNode,
  t.Any, SimpleNode
);
const Nodes = t.dict(t.String, Node, 'Nodes');

const AAs = t.union([As, t.list(As)], 'AAs');
const GraphNode = t.declare('GraphNode');
GraphNode.define(t.interface({
  A: AAs,
  fetch: Fetch, // the "cached" one
  _fetch: Fetch // the "naked" one
}), { strict: true });
const Graph = t.dict(t.String, GraphNode, 'Graph');

function find(nodes: Nodes|Graph, fetch: Fetch): ?(Node|GraphNode) {
  const P = _find(Object.keys(nodes), P => nodes[P].fetch === fetch || nodes[P]._fetch === fetch);
  return nodes[P];
}

function fetchToA(nodes: Nodes, fetch: Fetch): AAs {
  switch (fetch.type) {
    case DerivateFetchType('product'):
      return fetch.fetches.map(f => fetchToA(nodes, f));
    case DerivateFetchType('composition'):
      return fetchToA(nodes, fetch.master);
    default: // eslint-disable-line no-case-declarations
      const node = find(nodes, fetch);
      t.assert(Node.is(node), () => 'missing "naked" node for fetch');
      return node.A;
  }
}

function createOrReuseCached(nodes: Graph, _fetch: Fetch, P: t.String, strategy: Strategy): Fetch {
  switch (_fetch.type) {
    case DerivateFetchType('product'):
      return product(_fetch.fetches.map(f => createOrReuseCached(nodes, f, P, strategy)));
    case DerivateFetchType('composition'):
      return compose(
        createOrReuseCached(nodes, _fetch.master, P, strategy),
        _fetch.ptoa,
        createOrReuseCached(nodes, _fetch.slave, P, strategy)
      );
    default:
      return (find(nodes, _fetch) || {}).fetch || cacheFetch(_fetch, strategy, new ObservableCache({ name: P }))
  }
}

export function make(input: Nodes): Graph {
  const all = Object.keys(input);
  const atoms = all.filter(P => t.Nil.is(input[P].fetch.type));

  const _graph = atoms.reduce((graph, P) => {
    const _fetch = input[P].fetch;
    const A = input[P].A || fetchToA(input, _fetch);
    const strategy = input[P].strategy || refetch;
    const cache = new ObservableCache({ name: P });
    const fetch = cacheFetch(_fetch, strategy, cache);
    return Object.assign(graph, { [P]: GraphNode({ fetch, A, _fetch }) });
  }, {});

  const composed = all.filter(P => !t.Nil.is(input[P].fetch.type));

  return composed.reduce((graph, P) => {
    const _fetch = input[P].fetch;
    const A = fetchToA(input, _fetch);
    const strategy = input[P].strategy || refetch;
    const fetch = createOrReuseCached(graph, _fetch, P, strategy);
    return Object.assign(graph, { [P]: GraphNode({ fetch, A, _fetch }) });
  }, _graph);
}

const Pss = t.list(t.String, 'Pss');
const AA = t.dict(t.String, t.Any, 'AA');

function argumentz(graph: Graph, Ps: Pss, A: AA) {
  return Ps.reduce((args, p) => {
    if (process.env.NODE_ENV !== 'production') {
      const argz = pick(A, flatten(graph[p].A));
      const provided = Object.keys(argz);
      t.assert(
        provided.length === uniq(flatten(graph[p].A)).length,
        () => `Missing arguments for query '${p}': ${difference(flatten(graph[p].A), provided).join(',')}`
      );
    }
    const argz = (() => {
      const isProduct = t.Array.is(graph[p].A[0]);
      if (isProduct) {
        return graph[p].A.map(a => pick(A, a));
      }
      return pick(A, graph[p].A);
    })();
    return Object.assign(args, { [p]: argz });
  }, {});
}

export function query(graph: Graph, Ps: Pss, A: AA)/*: Observable */ {
  const queries = Ps.reduce((qs, p) => {
    t.assert(GraphNode.is(graph[p]), () => `missing graph node '${p}'`);
    return Object.assign(qs, { [p]: graph[p].fetch })
  }, {});
  const args = argumentz(graph, Ps, A);

  return apply(queries, args);
}

export function invalidate(graph: Graph, Ps: Pss, A: AA): t.Nil {
  const args = argumentz(graph, Ps, A);

  for (const P of Ps) { // eslint-disable-line no-loops/no-loops
    graph[P].fetch(args[P]);
  }
}
