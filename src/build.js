import t from 'tcomb';
import { AvengerInput } from './types';
import upset from './upset';
import find from 'lodash/collection/find';
import every from 'lodash/collection/every';
import omit from 'lodash/object/omit';

// (AvengerInput, AvengerInput) -> QueryNodes
export default function build(input, all) {
  if (process.env.NODE_ENV !== 'production') {
    t.assert(AvengerInput.is(input), `invalid input provided to build`);
    t.assert(AvengerInput.is(all), `invalid all provided to build`);
  }

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
