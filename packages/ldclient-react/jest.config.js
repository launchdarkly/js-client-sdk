module.exports = {
  reporters: ['default', 'jest-junit'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  transform: {
    '\\.(ts|tsx|js)$': 'ts-jest',
  },
  testRegex: '.*\\.test\\.(ts|tsx|js)$',
};
