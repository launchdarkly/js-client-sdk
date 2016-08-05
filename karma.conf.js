module.exports = function(config) {
  config.set({
    files: [
      'tests.webpack.js'
    ],
    
    preprocessors: {
      'tests.webpack.js': [ 'webpack', 'sourcemap' ]
    },
    
    reporters: ['mocha'],
    
    frameworks: ['mocha', 'chai', 'sinon'],
    
    browsers: ['Chrome'],
    
    webpack: {
      devtool: 'inline-source-map'
    },
    
    webpackServer: {
      noInfo: true
    }
  });
};
