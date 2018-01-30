import * as utils from './utils';

var json = 'application/json';

function fetchJSON(endpoint, body, callback) {
  var xhr = new XMLHttpRequest();

  xhr.addEventListener('load', function() {
    if (xhr.status === 200 && xhr.getResponseHeader('Content-type') === json) {
      callback(null, JSON.parse(xhr.responseText));
    } else {
      callback(xhr.statusText);
    }
  });

  xhr.addEventListener('error', function() {
    if (xhr.status === 404) {
      var error;
      if (endpoint.includes('/sdk/eval/')) {
        error = 'Error fetching flag settings';
      } else if (endpoint.includes('/sdk/goals/')) {
        error = 'Error fetching goals';
      } else {
        error = 'Error';
      }
      console.error(
        error +
          ': environment not found. Please see https://docs.launchdarkly.com/docs/js-sdk-reference#section-initializing-the-client for instructions on SDK initialization.'
      );
    }
    callback(xhr.statusText);
  });

  if (body) {
    xhr.open('REPORT', endpoint);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(body));
  } else {
    xhr.open('GET', endpoint);
    xhr.send();
  }

  return xhr;
}

var flagSettingsRequest;
var lastFlagSettingsCallback;

function Requestor(baseUrl, environment, useReport) {
  var requestor = {};

  requestor.fetchFlagSettings = function(user, hash, callback) {
    var data;
    var endpoint;
    var body;
    var cb;

    if (useReport) {
      endpoint = [baseUrl, '/sdk/eval/', environment, '/user', hash ? '?h=' + hash : ''].join('');
      body = user;
    } else {
      data = utils.base64URLEncode(JSON.stringify(user));
      endpoint = [baseUrl, '/sdk/eval/', environment, '/users/', data, hash ? '?h=' + hash : ''].join('');
    }

    var wrappedCallback = (function(currentCallback) {
      return function() {
        currentCallback.apply(null, arguments);
        flagSettingsRequest = null;
        lastFlagSettingsCallback = null;
      };
    })(callback);
    var wrappedCallback = (function(currentCallback) {
      return function() {
        currentCallback.apply(null, arguments);
        flagSettingsRequest = null;
        lastFlagSettingsCallback = null;
      };
    })(callback);

    lastFlagSettingsCallback = cb;
    flagSettingsRequest = fetchJSON(endpoint, body, cb);
  };
  requestor.fetchGoals = function(callback) {
    var endpoint = [baseUrl, '/sdk/goals/', environment].join('');
    fetchJSON(endpoint, null, callback);
  };
  return requestor;
}
