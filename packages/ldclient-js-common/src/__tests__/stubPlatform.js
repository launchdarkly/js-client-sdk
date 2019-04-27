import sinon from 'sinon';
import EventSource from './EventSource-mock';
import * as LDClient from '../index';
import EventEmitter from '../EventEmitter';

const sinonXhr = sinon.useFakeXMLHttpRequest();
sinonXhr.restore();

// This file provides a stub implementation of the internal platform API for use in tests.
//
// The SDK expects the platform object to have the following properties and methods:
//
// httpRequest?: (method, url, headers, body, sync) => requestProperties
//   requestProperties.promise: Promise     // resolves to { status, header: (name) => value, body } or rejects for a network error
//   requestProperties.cancel?: () => void  // provided if it's possible to cancel requests in this implementation
// httpAllowsPost: boolean        // true if we can do cross-origin POST requests
// getCurrentUrl: () => string    // returns null if we're not in a browser
// isDoNotTrack: () => boolean
// localStorage: {
//   get: (key: string, callback: (err: Error, data: string) => void) => void
//   set: (key: string, data: string, callback: (err: Error) => void) => void
//   clear: (key: string, callback: (err: Error) => void) => void
// }
// eventSourceFactory?: (url: string, options: object) => EventSource
//   // note that the options are ignored by the browser's built-in EventSource; they only work with polyfills
// eventSourceIsActive?: (es: EventSource) => boolean  // returns true if it's open or connecting
// eventSourceAllowsReport?: boolean  // returns true if we can set { method: 'REPORT' } in the options
// userAgent: string
// version?: string  // the SDK version for the User-Agent header, if that is *not* the same as the version of ldclient-js-common

export function defaults() {
  const localStore = {};
  let currentUrl = null;
  let doNotTrack = false;

  const p = {
    httpRequest: newHttpRequest,
    httpAllowsPost: () => true,
    httpAllowsSync: () => true,
    getCurrentUrl: () => currentUrl,
    isDoNotTrack: () => doNotTrack,
    eventSourceFactory: (url, options) => {
      const es = new EventSource(url);
      es.options = options;
      return es;
    },
    eventSourceIsActive: es => es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING,
    localStorage: {
      get: key =>
        new Promise(resolve => {
          resolve(localStore[key]);
        }),
      set: (key, value) =>
        new Promise(resolve => {
          localStore[key] = value;
          resolve();
        }),
      clear: key =>
        new Promise(resolve => {
          delete localStore[key];
          resolve();
        }),
    },
    userAgent: 'stubClient',

    // extra methods used for testing
    testing: {
      logger: logger(),

      makeClient: (env, user, options = {}) => {
        const config = Object.assign({ logger: p.testing.logger }, options);
        return LDClient.initialize(env, user, config, p).client;
      },

      setCurrentUrl: url => {
        currentUrl = url;
      },

      setDoNotTrack: value => {
        doNotTrack = value;
      },

      getLocalStorageImmediately: key => localStore[key],

      setLocalStorageImmediately: (key, value) => {
        localStore[key] = value;
      },
    },
  };
  return p;
}

export function withoutHttp() {
  const e = defaults();
  delete e.httpRequest;
  return e;
}

export function logger() {
  const logger = {};
  ['debug', 'info', 'warn', 'error'].forEach(level => {
    logger[level] = msg => logger.output[level].push(typeof msg === 'function' ? msg() : msg);
  });
  logger.reset = () => {
    logger.output = { debug: [], info: [], warn: [], error: [] };
  };
  logger.reset();
  return logger;
}

export function mockStateProvider(initialState) {
  const sp = EventEmitter();
  sp.getInitialState = () => initialState;
  return sp;
}

// This HTTP implementation is basically the same one that's used in the browser client, but it's
// made to interact with Sinon, so that the tests can use the familiar Sinon API.
//
// It'd be nice to be able to reuse this same logic in the browser client instead of copying it,
// but it's not of any use in Node or Electron so it doesn't really belong in the common package.

function newHttpRequest(method, url, headers, body, synchronous) {
  const xhr = new sinonXhr();
  xhr.open(method, url, !synchronous);
  for (const key in headers || {}) {
    if (headers.hasOwnProperty(key)) {
      xhr.setRequestHeader(key, headers[key]);
    }
  }
  if (synchronous) {
    const p = new Promise(resolve => {
      xhr.send(body);
      resolve();
    });
    return { promise: p };
  } else {
    let cancelled;
    const p = new Promise((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (cancelled) {
          return;
        }
        resolve({
          status: xhr.status,
          header: key => xhr.getResponseHeader(key),
          body: xhr.responseText,
        });
      });
      xhr.addEventListener('error', () => {
        if (cancelled) {
          return;
        }
        reject(new Error());
      });
      xhr.send(body);
    });
    const cancel = () => {
      cancelled = true;
      xhr.abort();
    };
    return { promise: p, cancel: cancel };
  }
}
