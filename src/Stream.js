import { base64URLEncode } from './utils';

export default function Stream(baseUrl, environment, hash, config) {
  const stream = {};
  const evalUrlPrefix = baseUrl + '/eval/' + environment + '/';
  const useReport = (config && config.useReport) || false;
  const withReasons = (config && config.evaluationReasons) || false;
  const streamReconnectDelay = (config && config.streamReconnectDelay) || 1000;
  const timeoutMillis = 300000; // 5 minutes (same as other SDKs) - note, this only has an effect on polyfills
  let es = null;
  let reconnectTimeoutReference = null;
  let user = null;
  let handlers = null;

  stream.connect = function(newUser, newHandlers) {
    user = newUser;
    handlers = newHandlers;
    tryConnect();
  };

  stream.disconnect = function() {
    clearTimeout(reconnectTimeoutReference);
    reconnectTimeoutReference = null;
    closeConnection();
  };

  stream.isConnected = function() {
    return es && (es.readyState === window.EventSource.OPEN || es.readyState === window.EventSource.CONNECTING);
  };

  function reconnect() {
    closeConnection();
    tryConnect(streamReconnectDelay);
  }

  function tryConnect(delay) {
    if (!reconnectTimeoutReference) {
      if (delay) {
        reconnectTimeoutReference = setTimeout(openConnection, delay);
      } else {
        openConnection();
      }
    }
  }

  function openConnection() {
    let url;
    let query = '';
    if (typeof window.EventSource !== 'undefined') {
      if (useReport) {
        // we don't yet have an EventSource implementation that supports REPORT, so
        // fall back to the old ping-based stream
        url = baseUrl + '/ping/' + environment;
      } else {
        url = evalUrlPrefix + base64URLEncode(JSON.stringify(user));
        if (hash !== null && hash !== undefined) {
          query = 'h=' + hash;
        }
      }
      if (withReasons) {
        query = query + (query ? '&' : '') + 'withReasons=true';
      }
      url = url + (query ? '?' : '') + query;

      closeConnection();

      // The standard EventSource constructor doesn't take any options, just a URL. However, some
      // EventSource polyfills allow us to specify a timeout interval, and in some cases they will
      // default to a too-short timeout if we don't specify one. So, here, we are setting the
      // timeout properties that are used by several popular polyfills.
      const options = {
        heartbeatTimeout: timeoutMillis, // used by "event-source-polyfill" package
        silentTimeout: timeoutMillis, // used by "eventsource-polyfill" package
      };

      es = new window.EventSource(url, options);
      for (const key in handlers) {
        if (handlers.hasOwnProperty(key)) {
          es.addEventListener(key, handlers[key]);
        }
      }

      es.onerror = reconnect;
    }
  }

  function closeConnection() {
    if (es) {
      es.close();
      es = null;
    }
  }

  return stream;
}
