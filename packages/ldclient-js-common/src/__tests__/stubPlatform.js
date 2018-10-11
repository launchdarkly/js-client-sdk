import * as LDClient from '../index';

let currentUrl = null;
let doNotTrack = false;

export function stubEnvironment() {
  return {
    getCurrentUrl: () => currentUrl,
    isDoNotTrack: () => doNotTrack,
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
