const common = require('../../rollup.common.config');
const pkg = require('./package.json');

const plugins = common.plugins({
  commonjs: {
    include: 'node_modules/**',
    namedExports: {
      'node_modules/electron/index.js': [ 'ipcRenderer', 'remote', 'webContents' ]
    }
  }
});

const config = {
  plugins: plugins,
  input: 'src/index.js',
  output: {
    plugins: plugins,
    name: 'LDClient',
    file: './dist/ldclient-electron.js',
    format: 'cjs',
    sourcemap: true,
  },
  external: Object.keys(pkg.dependencies),
};

module.exports = config;
