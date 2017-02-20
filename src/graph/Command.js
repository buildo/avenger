import uniq from 'lodash/uniq';
import flatMap from 'lodash/flatMap';
import flattenDeep from 'lodash/flattenDeep';

export const Command = ({ invalidates = {}, params = {}, ...c }) => {
  const invalidateA = uniq(flatMap(invalidates, query => flattenDeep(query.A)));
  const invalidateParams = {
    ...Object.keys(invalidates).reduce((ac, k) => ({
      ...ac, ...invalidates[k].upsetParams
    }), {}),
    ...params
  };
  return {
    ...c, invalidates, params, invalidateA, invalidateParams
  };
};