var utils = require('./utils');

var json = 'application/json';

function fetchJSON(endpoint, callback) {
  var xhr = new XMLHttpRequest();

  xhr.addEventListener('load', function() {
    if (xhr.status === 200 && xhr.getResponseHeader('Content-type') === json) {
      callback(null, JSON.parse(xhr.responseText));
    } else {
      callback(xhr.statusText);
    }
  });

  xhr.addEventListener('error', function() {
    if(xhr.status === 404) {
      var error
      if(endpoint.includes('/sdk/eval/')) {
        error = 'Error fetching flag settings'
      }
      else if(endpoint.includes('/sdk/goals/')) {
        error = 'Error fetching goals'
      }
      else {
        error = 'Error'
      }
      console.error(error + ': environment not found. Please see https://docs.launchdarkly.com/docs/js-sdk-reference#section-initializing-the-client for instructions on SDK initialization.')
    }
    callback(xhr.statusText);
  });

  xhr.open('GET', endpoint);
  xhr.send();

  return xhr;
}

var flagSettingsRequest;
var lastFlagSettingsCallback;

function Requestor(baseUrl, environment) {
  var requestor = {};

  requestor.fetchFlagSettings = function(user, hash, callback) {
    var data = utils.base64URLEncode(JSON.stringify(user));
    var endpoint = [baseUrl, '/sdk/eval/', environment,  '/users/', data, hash ? '?h=' + hash : ''].join('');
    var cb;

    var wrappedCallback = (function(currentCallback) {
      return function() {
        currentCallback.apply(null, arguments);
        flagSettingsRequest = null;
        lastFlagSettingsCallback = null;
      };
    })(callback);


    if (flagSettingsRequest) {
      flagSettingsRequest.abort();
      cb = (function(prevCallback) {
        return function() {
          prevCallback && prevCallback.apply(null, arguments);
          wrappedCallback.apply(null, arguments);
        };
      })(lastFlagSettingsCallback);
    } else {
      cb = wrappedCallback;
    }

    lastFlagSettingsCallback = cb;
    flagSettingsRequest = fetchJSON(endpoint, cb);
  };

  requestor.fetchGoals = function(callback) {
    var endpoint = [baseUrl, '/sdk/goals/', environment].join('');
    fetchJSON(endpoint, callback);
  };

  return requestor;
}

module.exports = Requestor;
