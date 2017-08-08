var utils = require('./utils');

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
    callback(xhr.statusText);
  });
  
  if (body) {
    xhr.open('REPORT', endpoint);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(body));
  } else {
    xhr.open('GET', endpoint);
    xhr.send();
  }
  
  return xhr;
}

var flagSettingsRequest;
var lastFlagSettingsCallback;

function Requestor(baseUrl, environment, useGet) {
  var requestor = {};
  
  requestor.fetchFlagSettings = function(user, hash, callback) {
    var data;
    var endpoint;
    var body;
    var cb;

    if (useGet) {
      data = utils.base64URLEncode(JSON.stringify(user));
      endpoint  = [baseUrl, '/sdk/eval/', environment,  '/users/', data, hash ? '?h=' + hash : ''].join('');
    } else {
      endpoint = [baseUrl, '/sdk/eval/', environment,  '/user', hash ? '?h=' + hash : ''].join('');
      body = user;
    }

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
    flagSettingsRequest = fetchJSON(endpoint, body, cb);
  };
  
  requestor.fetchGoals = function(callback) {
    var endpoint = [baseUrl, '/sdk/goals/', environment].join('');
    fetchJSON(endpoint, null, callback);
  };
  
  return requestor;
}

module.exports = Requestor;
