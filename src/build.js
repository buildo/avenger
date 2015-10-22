import t from 'tcomb';
import { AvengerInput, QueryNodes } from './types';
import upset from './upset';
import find from 'lodash/collection/find';
import every from 'lodash/collection/every';
import omit from 'lodash/object/omit';

export default function build(
  input: AvengerInput,
  all: AvengerInput
): QueryNodes {
  const _upset = upset(input);

  const builtUp = Object.keys(_upset).reduce(({ from, to }) => {
    const fromList = Object.keys(from).map(k => from[k]);
    const firstFree = find(
      fromList,
      ({ dependencies: deps }) => every(
        Object.keys(deps || {}).map(k => deps[k].query.id),
        id => !!to[id]
      )
    );
    return {
      from: {
        ...omit(from, firstFree.id)
      },
      to: {
        ...to,
        [firstFree.id]: {
          query: firstFree,
          parents: Object.keys((firstFree.dependencies || {}))
            .map(k => firstFree.dependencies[k].query.id)
            .reduce((parents, id) => ({
              ...parents,
              [id]: to[id]
            }), {}),
          children: {}
        }
      }
    };
  }, {
    from: { ..._upset },
    to: {}
  }).to;

  const builtUpList = Object.keys(builtUp).map(qId => builtUp[qId]);
  return builtUpList.reduce((ac, qn) => ({
    ...ac,
    [qn.query.id]: (() => {
      qn.children = builtUpList.filter(({ parents }) => !!parents[qn.query.id]).reduce((nc, n) => ({
        ...nc,
        [n.query.id]: n
      }), {});
      return qn;
    })()
  }), {});
}
