const common = require('../../rollup.common.config');
const pkg = require('./package.json');

const config = Object.assign({}, common, {
  input: 'src/index.js',
  output: {
    plugins: common.plugins,
    name: 'LDClient',
    file: './dist/ldclient-electron.js',
    format: 'cjs',
    sourcemap: true,
  },
  external: Object.keys(pkg.dependencies),
});

module.exports = config;
