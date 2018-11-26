const common = require('../../rollup.common.config');
const pkg = require('./package.json');

const plugins = common.plugins();

const config = {
  plugins: plugins,
  input: 'src/index.js',
  output: [
    {
      plugins: plugins,
      name: 'LDClient-Common',
      file: process.env.NODE_ENV === 'production' ? './dist/ldclient-common.min.js' : './dist/ldclient-common.js',
      format: 'umd',
      sourcemap: true,
    },
    { file: pkg.main, format: 'cjs', sourcemap: true },
    { file: pkg.module, format: 'es', sourcemap: true },
  ],
};

module.exports = config;
