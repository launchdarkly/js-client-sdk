import sinon from 'sinon';
import EventSource from './EventSource-mock';
import * as LDClient from '../index';

let currentUrl = null;
let doNotTrack = false;
let localStore = {};

const sinonXhr = sinon.useFakeXMLHttpRequest();
sinonXhr.restore();

export function defaults() {
  return {
    newHttpRequest: () => new sinonXhr(),
    httpAllowsPost: () => true,
    getCurrentUrl: () => currentUrl,
    isDoNotTrack: () => doNotTrack,
    eventSourceFactory: (url, body) => {
      const es = new EventSource(url);
      es.requestBody = body;
      return es;
    },
    eventSourceIsActive: es => es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING,
    localStorage: {
      get: (key, callback) => {
        console.log('*** get timeout');
        setTimeout(() => {
          console.log('*** calling back');
          callback(null, localStore[key]);
        }, 0);
      },
      set: (key, value, callback) => {
        localStore[key] = value;
        setTimeout(callback, 0);
      },
      clear: (key, callback) => {
        delete localStore[key];
        setTimeout(callback, 0);
      },
    },
  };
}

export function withoutHttp() {
  const e = defaults();
  delete e.newHttpRequest;
  return e;
}

export function setCurrentUrl(url) {
  currentUrl = url;
}

export function setDoNotTrack(value) {
  doNotTrack = value;
}

export function resetLocalStorage() {
  localStore = {};
}

export function makeClient(env, user, options = {}) {
  return LDClient.initialize(env, user, options, defaults()).client;
}
