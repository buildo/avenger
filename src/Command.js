export const Command = ({ invalidates = {}, params = {}, ...c }) => {
  const invalidateParams = {
    ...Object.keys(invalidates).reduce((ac, k) => ({
      ...ac, ...invalidates[k].upsetParams
    }), {}),
    ...params
  };
  return {
    ...c, invalidates, params, invalidateParams
  };
};
