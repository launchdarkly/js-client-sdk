var utils = require('./utils');

function Stream(baseUrl, environment) {
  var stream = {};
  var urlPrefix = baseUrl + '/eval/' + environment;
  var es = null;

  stream.connect = function(user, handlers) {
    if (typeof EventSource !== 'undefined') {
      var url = urlPrefix + '/' + utils.base64URLEncode(JSON.stringify(user));
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
