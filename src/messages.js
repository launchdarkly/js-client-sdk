var docLink = ' Please see https://docs.launchdarkly.com/docs/js-sdk-reference#section-initializing-the-client for instructions on SDK initialization.';

module.exports = {
  clientNotReady: function() {
    return 'LaunchDarkly client is not ready';
  },
  invalidKey: function() {
    return 'Event key must be a string';
  },
  localStorageUnavailable: function() {
    return 'localStorage is unavailable';
  },
  unknownCustomEventKey: function(key) {
    return 'Custom event "' + key + '" does not exist';
  },
  environmentNotFound: function() {
    return 'environment not found.' + docLink;
  },
  environmentNotSpecified: function() {
    return 'No environment specified.' + docLink;
  },
  errorFetchingFlags: function(err) {
    return 'Error fetching flag settings: ' + (err.message || err);
  },
  userNotSpecified: function() {
    return 'No user specified.' + docLink;
  },
  invalidUser: function() {
    return 'Invalid user specified.' + docLink;
  }
};
