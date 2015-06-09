Promise.allValues = (prs) => {
  const keys = Object.keys(prs);
  const promises = keys.map((k) => prs[k]);
  return Promise.all(promises).then((vals) => {
    const res = {};
    for (var i = 0; i < keys.length; i++) {
      res[keys[i]] = vals[i];
    }
    return res;
  });
};
