var webpack = require('webpack');
var NODE_ENV = process.env.NODE_ENV || 'development';

module.exports = {
  devtool: 'source-map',
  entry: './dev/index.js',
  output: {
    path: __dirname,
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {
        loader: 'babel',
        exclude: [/node_modules/]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV)
    })
  ]
};