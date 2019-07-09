export default () => ({
  fetchFlagSettings: jest.fn().mockImplementation((user, hash, callback) => callback(null, {})),
});
