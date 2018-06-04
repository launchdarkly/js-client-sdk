import { base64URLEncode } from './utils';

export default function Stream(baseUrl, environment, hash, config) {
  const stream = {};
  const evalUrlPrefix = baseUrl + '/eval/' + environment + '/';
  const useReport = config.useReport || false;
  const reconnectDelay = config.streamReconnectDelay || 5000;
  let reconnectTimeoutReference;
  let es = null;

  stream.connect = function(user, handlers) {
    if (typeof EventSource !== 'undefined') {
      let url;
      clearTimeout(reconnectTimeoutReference);
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
      es.onerror = () => {
        reconnectTimeoutReference = setTimeout(() => {
          this.disconnect();
          this.connect(user, handlers);
        }, reconnectDelay);
      };
      for (const key in handlers) {
        if (handlers.hasOwnProperty(key)) {
          es.addEventListener(key, handlers[key]);
        }
      }
    }
  };

  stream.disconnect = function() {
    clearTimeout(reconnectTimeoutReference);
    if (es) {
      es.close();
    }
  };

  stream.isConnected = function() {
    return es && (es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING);
  };

  return stream;
}
