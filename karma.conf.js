const commonjs = require('rollup-plugin-commonjs');
const includePaths = require('rollup-plugin-includepaths');
const rollupConfig = require('./rollup.config.js');

rollupConfig.plugins.push(
  commonjs(),
  includePaths({})
);

rollupConfig.format = 'umd';

module.exports = function(config) {
  config.set({
    files: [
      'src/__tests__/*.js',
      'src/*.js',
    ],

    preprocessors: {
      'src/*.js': ['rollup'],
      'src/__tests__/*.js': ['rollup'],
    },
    rollupPreprocessor: rollupConfig,

    reporters: ['mocha'],

    frameworks: ['mocha', 'chai', 'sinon'],

    browsers: ['Chrome'],
  });
};
