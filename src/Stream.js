import { base64URLEncode } from './utils';

export default function Stream(baseUrl, environment, hash, useReport) {
  const stream = {};
  const evalUrlPrefix = baseUrl + '/eval/' + environment + '/';
  let es = null;

  stream.connect = function(user, handlers) {
    if (typeof EventSource !== 'undefined') {
      let url;
      if (useReport) {
        // we don't yet have an EventSource implementation that supports REPORT, so
        // fall back to the old ping-based stream
        url = baseUrl + '/ping/' + environment;
      } else {
        url = evalUrlPrefix + base64URLEncode(JSON.stringify(user));
        if (hash !== null && hash !== undefined) {
          url = url + '?h=' + hash;
        }
      }
      es = new window.EventSource(url);
      for (const key in handlers) {
        if (handlers.hasOwnProperty(key)) {
          es.addEventListener(key, handlers[key]);
        }
      }
    }
  };

  stream.disconnect = function() {
    if (es) {
      es.close();
    }
  };

  stream.isConnected = function() {
    return es && (es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING);
  };

  return stream;
}
