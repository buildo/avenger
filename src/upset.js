import { QueryNodes } from './types';

const _upset = query => {
  const deps = Object.keys(query.dependencies || {})
    .reduce((up, k) => ({
      ...up,
      ..._upset(query.dependencies[k].query)
    }), {});

  return {
    [query.id]: query,
    ...deps
  };
};

export default function upset(input: QueryNodes) {
  return Object.keys(input).reduce((up, qId) => ({
    ...up,
    ..._upset(input[qId])
  }), {});
}
