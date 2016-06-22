module.exports = function(config) {
  config.set({
    files: [
      'src/*.js',
      'test/*.js'
    ],
    
    plugins: [
      'karma-browserify',
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
      'test/*.js': ['browserify']
    },
    
    browsers: ['PhantomJS'],
    
    autoWatch: false,
    
    singleRun: false,
  });
};
