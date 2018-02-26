import { apply, applySync } from './query/apply';
import { distributeParams } from './util';
import mapValues from 'lodash/mapValues';

// request `queryNodes` queries, e.g:
//
//   { samples, tests }
//
// with `flatParams` arguments, e.g:
//
//   { token: 'asdafs', sampleId: 1, testId: 2 }
//
export function query(queryNodes, flatParams) {
  const queries = mapValues(queryNodes, n => n.fetch);
  const args = distributeParams(queryNodes, flatParams);
  return apply(queries, args);
}

export function querySync(queryNodes, A) {
  const queries = mapValues(queryNodes, n => n.fetch);
  const args = distributeParams(queryNodes, A);
  return applySync(queries, args);
}
