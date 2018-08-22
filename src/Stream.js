import { base64URLEncode } from './utils';

export default function Stream(baseUrl, environment, hash, config) {
  const stream = {};
  const evalUrlPrefix = baseUrl + '/eval/' + environment + '/';
  const useReport = (config && config.useReport) || false;
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
    close();
  };

  stream.isConnected = function() {
    return es && (es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING);
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
    if (typeof EventSource !== 'undefined') {
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

      closeConnection();
      es = new window.EventSource(url);
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
