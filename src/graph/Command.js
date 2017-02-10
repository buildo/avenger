import uniq from 'lodash/uniq';
import flatMap from 'lodash/flatMap';
import flattenDeep from 'lodash/flattenDeep';

export const Command = ({ invalidates, params = {}, ...c }) => {
  const invalidateParams = uniq(flatMap(invalidates, query => flattenDeep(query.A)));
  return {
    ...c, invalidates, params, invalidateParams
  };
};