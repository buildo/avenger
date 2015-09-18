import t from 'tcomb';
import { AvengerInput, QueryNode, Query } from './types';

// (AvengerInput, AvengerInput) -> QueryNodes
export default function build(input, all) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(input), `invalid input provided to build`);
    t.assert(AvengerInput.is(all), `invalid all provided to build`);
  }

  const _parents = (nodes, qId) => {
    if (nodes[qId]) {
      // we are done here
      return nodes;
    }

    const query = all[qId];

    if (process.env.NODE_ENV !== 'production') {
      t.assert(Query.is(query), `invalid or missing query ${qId}`);
    }

    const _deps = query.dependencies || {};
    const deps = Object.keys(_deps).map(k => _deps[k].query.id);

    // recursive step on deps
    const nodesAndDepNodes = deps.reduce(_parents, nodes);

    const depNodes = Object.keys(nodesAndDepNodes)
      .filter(k => deps.indexOf(k) !== -1)
      .reduce((dn, k) => ({
        ...dn,
        [k]: nodesAndDepNodes[k]
      }), {});

    // add self QueryNode and return nodes
    return {
      ...nodesAndDepNodes,
      [qId]: QueryNode({
        query,
        parents: { ...depNodes },
        children: {}
      })
    };
  };

  const builtUp = Object.keys(input).reduce(_parents, {});
  const builtUpList = Object.keys(builtUp).map(qId => builtUp[qId]);

  return builtUpList.reduce((ac, { query, parents }) => ({
    ...ac,
    [query.id]: QueryNode({
      query,
      parents,
      children: builtUpList.filter(({ parents }) => !!parents[query.id]).reduce((nc, n) => ({
        ...nc,
        [n.query.id]: n
      }), {})
    })
  }), {});
}
