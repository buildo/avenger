export default function minDepsParams(dependencies, depsResults) {
  return Object.keys(dependencies).reduce((ac, k) => {
    const map = dependencies[k].map || (x => x);
    return {
      ...ac,
      [k]: map(depsResults[dependencies[k].query.id])
    };
  }, {});
}
