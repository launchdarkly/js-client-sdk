import * as messages from './messages';
import * as utils from './utils';

export default function Store(localStorageProvider, environment, hash, ident) {
  const store = {};

  function getFlagsKey() {
    let key = '';
    const user = ident.getUser();
    if (user) {
      key = hash || utils.btoa(JSON.stringify(user));
    }
    return 'ld:' + environment + ':' + key;
  }

  store.loadFlags = function() {
    const key = getFlagsKey();
    let dataStr, data;
    try {
      dataStr = localStorageProvider.getItem(key);
    } catch (ex) {
      console.warn(messages.localStorageUnavailable());
      return null;
    }
    try {
      data = JSON.parse(dataStr);
    } catch (ex) {
      store.clearFlags();
      return null;
    }
    if (data) {
      const schema = data.$schema;
      if (schema === undefined || schema < 1) {
        data = utils.transformValuesToVersionedValues(data);
      }
    }
    return data;
  };

  store.saveFlags = function(flags) {
    const key = getFlagsKey();
    const data = utils.extend({}, flags, { $schema: 1 });
    try {
      localStorageProvider.setItem(key, JSON.stringify(data));
    } catch (ex) {
      console.warn(messages.localStorageUnavailable());
    }
  };

  store.clearFlags = function() {
    const key = getFlagsKey();
    try {
      localStorageProvider.removeItem(key);
    } catch (ex) {}
  };

  return store;
}
