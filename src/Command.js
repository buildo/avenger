export const Command = ({ invalidates = {}, params = {}, dependencies = {}, ...c }) => {
  const invalidateParams = {
    ...Object.keys(invalidates).reduce((ac, k) => ({
      ...ac, ...invalidates[k].upsetParams
    }), {}),
    ...params
  };

  const dependenciesParams = {
    ...Object.keys(dependencies).reduce((ac, k) => ({
      ...ac, ...dependencies[k].upsetParams
    }), {}),
    ...params
  };

  return {
    ...c, invalidates, params, invalidateParams, dependencies, dependenciesParams
  };
};
