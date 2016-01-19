import t from 'tcomb';

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
