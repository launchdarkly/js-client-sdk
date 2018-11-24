import { base64URLEncode } from './utils';

// The underlying event source implementation is abstracted via the platform object, which should
// have these three properties:
// eventSourceFactory(): a function that takes a URL and optional request body and returns an object
//   with the same methods as the regular HTML5 EventSource object. Passing a body parameter means
//   that the request should use REPORT instead of GET.
// eventSourceIsActive(): a function that takes an EventSource-compatible object and returns true if
//   it is in an active state (connected or connecting).
// eventSourceAllowsReport: true if REPORT is supported.

export default function Stream(platform, config, environment, hash) {
  const baseUrl = config.streamUrl;
  const stream = {};
  const evalUrlPrefix = baseUrl + '/eval/' + environment;
  const useReport = config.useReport;
  const withReasons = config.evaluationReasons;
  const streamReconnectDelay = config.streamReconnectDelay;
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
    return es && platform.eventSourceIsActive && platform.eventSourceIsActive(es);
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
    const options = {};
    if (platform.eventSourceFactory) {
      if (hash !== null && hash !== undefined) {
        query = 'h=' + hash;
      }
      if (useReport) {
        if (platform.eventSourceAllowsReport) {
          url = evalUrlPrefix;
          options.method = 'REPORT';
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify(user);
        } else {
          // if we can't do REPORT, fall back to the old ping-based stream
          url = baseUrl + '/ping/' + environment;
          query = '';
        }
      } else {
        url = evalUrlPrefix + '/' + base64URLEncode(JSON.stringify(user));
      }
      if (withReasons) {
        query = query + (query ? '&' : '') + 'withReasons=true';
      }
      url = url + (query ? '?' : '') + query;

      closeConnection();
      es = platform.eventSourceFactory(url, options);
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
