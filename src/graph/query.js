import { apply, applySync } from '../query/apply';
import { queriesAndArgs, flatGraph } from './util';

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
  const { queries, args } = queriesAndArgs(graph, Ps, A);
  return apply(queries, args);
}

export function querySync(_graph, Ps, A) {
  const graph = flatGraph(_graph);
  const { queries, args } = queriesAndArgs(graph, Ps, A);
  return applySync(queries, args);
}
