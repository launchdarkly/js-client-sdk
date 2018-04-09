var utils = require('./utils');

function Stream(baseUrl, environment, hash, useReport) {
  var stream = {};
  var evalUrlPrefix = baseUrl + '/eval/' + environment + '/';
  var es = null;

  stream.connect = function(user, handlers) {
    if (typeof EventSource !== 'undefined') {
      var url;
      if (useReport) {
        // we don't yet have an EventSource implementation that supports REPORT, so
        // fall back to the old ping-based stream
        url = baseUrl + '/ping/' + environment;
      } else {
        url = evalUrlPrefix + utils.base64URLEncode(JSON.stringify(user));
        if (hash !== null && hash !== undefined) {
          url = url + '?h=' + hash;
        }
      }
      es = new window.EventSource(url);
      for (var key in handlers) {
        if (handlers.hasOwnProperty(key)) {
          es.addEventListener(key, handlers[key]);
        }
      }
    }
  }

  stream.disconnect = function() {
    es && es.close();
  }

  stream.isConnected = function() {
    return es && (es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING);
  }

  return stream;
}

module.exports = Stream;
