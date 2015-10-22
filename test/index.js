const requireDir = require('require-dir');

require('babel/register')({
  ignore: /node_modules/,
  extensions: ['.js', '.jsx'],
  stage: 0,
  loose: true,
  plugins: ['tcomb']
});

requireDir('./tests', {
  recurse: true
});
