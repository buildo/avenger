const tsc = require('typescript');

const compilerOptions = {
  module: 'commonjs'
}

module.exports = {
  process(src, path) {
    return tsc.transpile(
      src,
      compilerOptions,
      path,
      []
    );
  }
};
