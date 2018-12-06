import * as errors from './errors';

export const clientInitialized = function() {
  return 'LaunchDarkly client initialized';
};

const docLink =
  ' Please see https://docs.launchdarkly.com/docs/js-sdk-reference#section-initializing-the-client for instructions on SDK initialization.';

export const clientNotReady = function() {
  return 'LaunchDarkly client is not ready';
};

export const eventWithoutUser = function() {
  return 'Be sure to call `identify` in the LaunchDarkly client: http://docs.launchdarkly.com/docs/running-an-ab-test#include-the-client-side-snippet';
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

export const bootstrapOldFormat = function() {
  return (
    'LaunchDarkly client was initialized with bootstrap data that did not include flag metadata. ' +
    'Events may not be sent correctly.' +
    docLink
  );
};

export const bootstrapInvalid = function() {
  return 'LaunchDarkly bootstrap data is not available because the back end could not read the flags.';
};

export const deprecated = function(oldName, newName) {
  return '[LaunchDarkly] "' + oldName + '" is deprecated, please use "' + newName + '"';
};

export const httpErrorMessage = function(status, context, retryMessage) {
  return (
    'Received error ' +
    status +
    (status === 401 ? ' (invalid SDK key)' : '') +
    ' for ' +
    context +
    ' - ' +
    (errors.isHttpErrorRecoverable(status) ? retryMessage : 'giving up permanently')
  );
};

export const httpUnavailable = function() {
  return 'Cannot make HTTP requests in this environment.' + docLink;
};

export const identifyDisabled = function() {
  return 'identify() has no effect here; it must be called on the main client instance';
};

export const debugPolling = function(url) {
  return 'polling for feature flags at ' + url;
};

export const debugStreamPing = function() {
  return 'received ping message from stream';
};

export const debugStreamPut = function() {
  return 'received streaming update for all flags';
};

export const debugStreamPatch = function(key) {
  return 'received streaming update for flag "' + key + '"';
};

export const debugStreamPatchIgnored = function(key) {
  return 'received streaming update for flag "' + key + '" but ignored due to version check';
};

export const debugStreamDelete = function(key) {
  return 'received streaming deletion for flag "' + key + '"';
};

export const debugStreamingDeleteIgnored = function(key) {
  return 'received streaming deletion for flag "' + key + '" but ignored due to version check';
};

export const debugEnqueueingEvent = function(kind) {
  return 'enqueueing "' + kind + '" event';
};

export const debugPostingEvents = function(count) {
  return 'sending ' + count + ' events';
};
