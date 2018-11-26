const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');
const replace = require('rollup-plugin-replace');
const uglify = require('rollup-plugin-uglify');
const builtins = require('rollup-plugin-node-builtins');
const globals = require('rollup-plugin-node-globals');
const filesize = require('rollup-plugin-filesize');

const env = process.env.NODE_ENV || 'development';
const version = process.env.npm_package_version;

function plugins(options) {
  let ret = [
    replace({
      'process.env.NODE_ENV': JSON.stringify(env),
      VERSION: JSON.stringify(version),
    }),
    globals(),
    builtins(),
    resolve({
      module: true,
      jsnext: true,
      main: true,
      preferBuiltins: true,
    }),
    commonjs(options && options.commonjs),
    babel(),
    filesize(),
  ];

  if (env === 'production') {
    ret = ret.concat(
      uglify({
        compress: {},
      })
    );
  }

  return ret;
}

module.exports = {
  plugins: plugins,
};

