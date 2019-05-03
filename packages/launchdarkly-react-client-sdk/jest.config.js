module.exports = {
  reporters: ['default', 'jest-junit'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  transform: {
    '\\.(ts|tsx)$': 'ts-jest',
  },
  testRegex: '.*\\.test\\.(ts|tsx)$',
  setupFilesAfterEnv: ['./setupTests.js'],
};
