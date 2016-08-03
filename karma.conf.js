module.exports = function(config) {
  config.set({
    files: [
      'src/*.js',
      'test/*-test.js'
    ],
    
    plugins: [
      'karma-browserify',
      'karma-chrome-launcher',
      'karma-phantomjs-launcher',
      'karma-phantomjs-shim',
      'karma-mocha',
      'karma-mocha-reporter',
      'karma-chai',
      'karma-sinon'
    ],
    
    reporters: ['mocha'],
    
    frameworks: ['browserify', 'mocha', 'chai', 'sinon'],
    
    browserify: {
      debug: true
    },
    
    preprocessors: {
      'src/*.js': ['browserify'],
      'test/*-test*.js': ['browserify']
    },
    
    browsers: ['Chrome'],
    
    autoWatch: false,
    
    singleRun: false,
  });
};
