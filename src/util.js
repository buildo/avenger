import zipObject from 'lodash/array/zipObject';

export function allValues(prs) {
  const keys = Object.keys(prs);
  const promises = keys.map((k) => prs[k]);
  return Promise.all(promises).then(values => zipObject(keys, values));
}
