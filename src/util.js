import zipObject from 'lodash/array/zipObject';

export const allValues = prs => {
  const keys = Object.keys(prs);
  const promises = keys.map((k) => prs[k]);
  return Promise.all(promises).then(
    values => zipObject(keys, values),
    err => {
      throw err;
    }
  ).catch(err => {
    throw err;
  });
};

export const collect = (o, map = v => v) => [
  (ac, k) => ({
    ...(ac || {}),
    [k]: map(o[k], k)
  }),
  {}
];

export const error = (emit, id, reject) => err => {
  reject(err);
  emit({ id, error: true }, err);
};
