import sinon from 'sinon';
import EventSource from './EventSource-mock';
import * as LDClient from '../index';
import EventEmitter from '../EventEmitter';

const sinonXhr = sinon.useFakeXMLHttpRequest();
sinonXhr.restore();

export function defaults() {
  const localStore = {};
  let currentUrl = null;
  let doNotTrack = false;

  const p = {
    newHttpRequest: () => new sinonXhr(),
    httpAllowsPost: () => true,
    getCurrentUrl: () => currentUrl,
    isDoNotTrack: () => doNotTrack,
    eventSourceFactory: (url, options) => {
      const es = new EventSource(url);
      es.options = options;
      return es;
    },
    eventSourceIsActive: es => es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING,
    localStorage: {
      get: (key, callback) => {
        setTimeout(() => {
          callback(null, localStore[key]);
        }, 0);
      },
      set: (key, value, callback) => {
        localStore[key] = value;
        setTimeout(() => callback(null), 0);
      },
      clear: (key, callback) => {
        delete localStore[key];
        setTimeout(() => callback(null), 0);
      },
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
  delete e.newHttpRequest;
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
