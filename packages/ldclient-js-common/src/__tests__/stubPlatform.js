import sinon from 'sinon';
import EventSource from './EventSource-mock';
import * as LDClient from '../index';

let currentUrl = null;
let doNotTrack = false;

const sinonXhr = sinon.useFakeXMLHttpRequest();
sinonXhr.restore();

export function stubEnvironment() {
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
  };
}

export function setCurrentUrl(url) {
  currentUrl = url;
}

export function setDoNotTrack(value) {
  doNotTrack = value;
}

export function makeClient(env, user, options = {}) {
  return LDClient.initialize(env, user, options, stubEnvironment()).client;
}
