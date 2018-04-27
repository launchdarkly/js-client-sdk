const docLink =
  ' Please see https://docs.launchdarkly.com/docs/js-sdk-reference#section-initializing-the-client for instructions on SDK initialization.';

export const clientNotReady = function() {
  return 'LaunchDarkly client is not ready';
};

export const invalidKey = function() {
  return 'Event key must be a string';
};

export const localStorageUnavailable = function() {
  return 'localStorage is unavailable';
};

export const unknownCustomEventKey = function(key) {
  return 'Custom event "' + key + '" does not exist';
};

export const environmentNotFound = function() {
  return 'environment not found.' + docLink;
};

export const environmentNotSpecified = function() {
  return 'No environment specified.' + docLink;
};

export const errorFetchingFlags = function(err) {
  return 'Error fetching flag settings: ' + (err.message || err);
};

export const userNotSpecified = function() {
  return 'No user specified.' + docLink;
};

export const invalidUser = function() {
  return 'Invalid user specified.' + docLink;
};
