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

let plugins = [
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
  commonjs(),
  babel(),
  filesize(),
];

if (env === 'production') {
  plugins = plugins.concat(
    uglify({
      compress: {},
    })
  );
}

const config = {
  plugins: plugins,
};

module.exports = config;
