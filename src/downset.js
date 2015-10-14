export default function downset(nodes) {
  return Object.keys(nodes).reduce((down, qId) => ({
    ...down,
    [qId]: nodes[qId],
    ...downset(nodes[qId].children)
  }), {});
}
