import { PromiseType } from './types';
import t from 'tcomb';
import zipObject from 'lodash/zipObject';

const DictOfPromises = t.dict(t.String, PromiseType, 'DictOfPromises');

export const allValues = (prs: DictOfPromises): PromiseType => {
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

export const collect = (o: t.Object, map = v => v) => [
  (ac, k) => ({
    ...(ac || {}),
    [k]: map(o[k], k)
  }),
  {}
];

export const error = (
  emit: t.Function, id: t.String, reject: t.Function
) => (err: t.Any) => {
  reject(err);
  emit({ id, error: true }, err);
};
