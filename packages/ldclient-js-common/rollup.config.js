const common = require('../../rollup.common.config');
const pkg = require('./package.json');

const config = Object.assign({}, common, {
  input: 'src/index.js',
  output: [
    {
      plugins: common.plugins,
      name: 'LDClient-Common',
      file: process.env.NODE_ENV === 'production' ? './dist/ldclient-common.min.js' : './dist/ldclient-common.js',
      format: 'umd',
      sourcemap: true,
    },
    { file: pkg.main, format: 'cjs', sourcemap: true },
    { file: pkg.module, format: 'es', sourcemap: true },
  ],
});

module.exports = config;
