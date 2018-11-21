const version = process.env.npm_package_version;

module.exports = {
  automock: false,
  resetModules: true,
  rootDir: 'src',
  setupFiles: ['./jest.setup.js'],
  testMatch: ['**/__tests__/**/*-test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  globals: {
    window: true,
    VERSION: version,
  },
  runner: '@jest-runner/electron',
  testEnvironment: '@jest-runner/electron/environment',
};
