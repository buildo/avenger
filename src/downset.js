import { QueryNodes } from './types';

export default function downset(nodes: QueryNodes): QueryNodes {
  return Object.keys(nodes).reduce((down, qId) => ({
    ...down,
    [qId]: nodes[qId],
    ...downset(nodes[qId].children)
  }), {});
}
