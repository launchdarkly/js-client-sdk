export default () => ({
  fetchFlagSettings: jest.fn().mockImplementation((user, hash, callback) => callback(null, {})),
  fetchGoals: jest.fn().mockImplementation(callback => callback(null, {})),
});
