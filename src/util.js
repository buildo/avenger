import { zipObj } from 'ramda';

export function allValues(prs) {
  const keys = Object.keys(prs);
  const promises = keys.map((k) => prs[k]);
  return Promise.all(promises).then(zipObj(keys));
}
