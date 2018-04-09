const webpackConfig = require('./webpack.config');

module.exports = function(config) {
  config.set({
    files: [
      'tests.webpack.js'
    ],
    
    preprocessors: {
      'tests.webpack.js': [ 'webpack', 'sourcemap' ]
    },
    
    reporters: ['mocha', 'junit'],
    
    junitReporter: {
      outputDir: process.env.JUNIT_REPORT_PATH || '.',
      outputFile: process.env.JUNIT_REPORT_NAME || 'junit.xml',
      useBrowserName: false
    },

    frameworks: ['mocha', 'chai', 'sinon'],
    
    browsers: ['Chrome'],
    
    webpack: webpackConfig,
    
    webpackServer: {
      noInfo: true
    }
  });
};
