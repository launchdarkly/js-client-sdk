import * as messages from './messages';

function get(key) {
  try {
    return localStorage.getItem(key);
  } catch (ex) {
    console.warn(messages.localStorageUnavailable());
  }
}

function set(key, item) {
  try {
    localStorage.setItem(key, item);
  } catch (ex) {
    console.warn(messages.localStorageUnavailable());
  }
}

function clear(key) {
  localStorage.removeItem(key);
}

export default {
  get: get,
  set: set,
  clear: clear,
};
