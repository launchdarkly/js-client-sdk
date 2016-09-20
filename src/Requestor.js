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
    var cb = callback;

    if (flagSettingsRequest) {
      flagSettingsRequest.abort();
      cb = (function(prevCallback) {
        return function() {
          prevCallback.apply(null, arguments);
          callback.apply(null, arguments);
        };
      })(lastFlagSettingsCallback);
    } else {
      cb = callback;
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
