import { base64URLEncode } from './utils';

export default function Stream(baseUrl, environment, hash, config) {
  const stream = {};
  const evalUrlPrefix = baseUrl + '/eval/' + environment + '/';
  const useReport = (config && config.useReport) || false;
  const withReasons = (config && config.evaluationReasons) || false;
  const streamReconnectDelay = (config && config.streamReconnectDelay) || 1000;
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

      // The standard EventSource constructor doesn't take any options, just a URL. However, there's
      // a known issue with one of the EventSource polyfills, Yaffle, which has a fairly short
      // default timeout - much shorter than our heartbeat interval - causing unnecessary reconnect
      // attempts and error logging. Yaffle allows us to override this with the "heartbeatTimeout"
      // property. This should be ignored by other implementations that don't have such an option.
      const options = {
        heartbeatTimeout: 300000  // 5-minute timeout; LD stream sends heartbeats every 3 min
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
