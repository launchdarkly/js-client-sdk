const version = process.env.npm_package_version;

module.exports = {
  automock: false,
  resetModules: true,
  rootDir: 'src',
  setupFiles: ['jest-localstorage-mock', './jest.setup.js'],
  testMatch: ['**/__tests__/**/*-test.js'],
  transform: {
    '^.+\\.js$': ['babel-jest', { rootMode: 'upward' }],
  },
  globals: {
    window: true,
    VERSION: version,
  },
  testEnvironmentOptions: {
    url: 'https://mydomain.com/some/path',
  },
  testEnvironment: 'jsdom',
};
