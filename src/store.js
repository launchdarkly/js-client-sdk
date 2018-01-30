import * as messages from './messages';

function get(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (ex) {
    console.warn(messages.localStorageUnavailable());
  }
}

function set(key, item) {
  try {
    window.localStorage.setItem(key, item);
  } catch (ex) {
    console.warn(messages.localStorageUnavailable());
  }
}

function clear(key) {
  set(key, null);
}

module.exports = {
  get: get,
  set: set,
  clear: clear,
};
