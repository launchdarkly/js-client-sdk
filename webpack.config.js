const webpack = require('webpack');
const package = require('./package.json');

module.exports = {
  output: {
    library: 'LDClient',
    libraryTarget: 'umd'
  },
  plugins: [
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(package.version)
    })
  ]
};
