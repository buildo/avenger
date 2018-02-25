import { apply, applySync } from '../query/apply';
import { distributeParams, flatGraph } from './util';
import pick from 'lodash/pick';
import mapValues from 'lodash/mapValues';

// query the `graph`
// request `Ps` queries, e.g:
//
//   ['samples', 'tests']
//
// with `A` arguments, e.g:
//
//   { token: 'asdafs', sampleId: 1, testId: 2 }
//
export function query(_graph, Ps, A) {
  const graph = flatGraph(_graph);
  const queries = pick(graph, Ps);
  const args = distributeParams(queries, A);
  return apply(mapValues(queries, n => n.cachedFetch || n.fetch), args);
}

export function querySync(_graph, Ps, A) {
  const graph = flatGraph(_graph);
  const queries = pick(graph, Ps);
  const args = distributeParams(queries, A);
  return applySync(mapValues(queries, n => n.cachedFetch || n.fetch), args);
}
