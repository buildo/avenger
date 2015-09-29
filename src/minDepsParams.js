export default function minDepsParams(dependencies, depsResults) {
  return Object.keys(dependencies).reduce((ac, k) => ({
    ...ac,
    [k]: dependencies[k].map(depsResults[dependencies[k].query.id])
  }), {});
}
