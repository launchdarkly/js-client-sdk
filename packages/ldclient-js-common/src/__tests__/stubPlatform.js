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

    // extra methods used for testing
    testing: {
      makeClient: (env, user, options = {}) => LDClient.initialize(env, user, options, p).client,

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

export function mockStateProvider(initialState) {
  const sp = EventEmitter();
  sp.getInitialState = () => initialState;
  return sp;
}
