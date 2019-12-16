const pkg = require('./package.json');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');
const replace = require('@rollup/plugin-replace');
const { terser } = require('rollup-plugin-terser');
const { uglify } = require('rollup-plugin-uglify');
const filesize = require('rollup-plugin-filesize');

const env = process.env.NODE_ENV || 'development';
const version = process.env.npm_package_version;

const entryPoint = 'src/index.js';

const basePlugins = [
  replace({
    'process.env.NODE_ENV': JSON.stringify(env),
    VERSION: JSON.stringify(version),
  }),
  resolve({
    mainFields: ['browser', 'module', 'main'],
    preferBuiltins: true,
  }),
  commonjs(),
  babel({
    exclude: 'node_modules/**',
  }),
  filesize(),
];

const plugins = env === 'production' ?
  basePlugins.concat(
    uglify()
  ) :
  basePlugins;

const esPlugins = env === 'production' ?
  basePlugins.concat(
    terser()
  ) : basePlugins;

const configs = [
  {
    input: entryPoint,
    output: {
      name: 'LDClient',
      file: process.env.NODE_ENV === 'production' ? './dist/ldclient.min.js' : './dist/ldclient.js',
      format: 'umd',
      sourcemap: true,
    },
    plugins: plugins,
  },
  {
    input: entryPoint,
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true,
    },
    plugins: plugins,
  },
  {
    input: entryPoint,
    output: {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
    plugins: esPlugins,
  },
];

module.exports = configs;
