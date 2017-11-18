const webpackConfig = require('./webpack.config');

module.exports = function(config) {
  config.set({
    files: [
    ],

    preprocessors: {
    },

    reporters: ['mocha'],

    frameworks: ['mocha', 'chai', 'sinon'],

    browsers: ['Chrome'],

    webpack: webpackConfig,

    webpackServer: {
      noInfo: true
    }
  });
};
