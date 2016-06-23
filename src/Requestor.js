var utils = require('./utils');

var json = 'application/json';

function fetchJSON(endpoint, callback) {
  var xhr = new XMLHttpRequest();
  
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status === 200 && xhr.getResponseHeader('Content-type') === json) {
        callback(null, JSON.parse(xhr.responseText));
      } else {
        callback(xhr.statusText);
      }
    }
  };
  
  xhr.open('GET', endpoint);
  xhr.send();
}

function Requestor(baseUrl, environment) {
  var requestor = {};
  
  requestor.fetchFlagSettings = function(user, hash, callback) {
    var data = utils.base64URLEncode(JSON.stringify(user));
    var endpoint = [baseUrl, '/sdk/eval/', environment,  '/users/', data, hash ? '?h=' + hash : ''].join('');
    fetchJSON(endpoint, callback);
  };
  
  requestor.fetchGoals = function(callback) {
    var endpoint = [baseUrl, '/sdk/goals/', environment].join('');
    fetchJSON(endpoint, callback);
  };
  
  return requestor;
}

module.exports = Requestor;
