import * as messages from './messages';
import * as utils from './utils';

// The localStorageProvider is provided by the platform object. It should have the following
// *asynchronous* methods:
// - get(key, callback): Gets the string value, if any, for the given key; calls callback(error, value)
// - set(key, value, callback): Stores a string value for the given key; calls callback(error)
// - remove(key, callback): Removes the given key; calls callback(error)
export default function Store(localStorageProvider, environment, hash, ident, logger) {
  const store = {};

  function getFlagsKey() {
    let key = '';
    const user = ident.getUser();
    if (user) {
      key = hash || utils.btoa(JSON.stringify(user));
    }
    return 'ld:' + environment + ':' + key;
  }

  store.loadFlags = function(callback) {
    localStorageProvider.get(getFlagsKey(), (err, dataStr) => {
      if (err) {
        logger.warn(messages.localStorageUnavailable());
        callback && callback(err, null);
      } else {
        if (dataStr === null || dataStr === undefined) {
          callback && callback(null, null);
          return;
        }
        try {
          let data = JSON.parse(dataStr);
          if (data) {
            const schema = data.$schema;
            if (schema === undefined || schema < 1) {
              data = utils.transformValuesToVersionedValues(data);
            } else {
              delete data['$schema'];
            }
          }
          callback && callback(null, data);
        } catch (ex) {
          store.clearFlags(() => {
            callback && callback(ex, null);
          });
        }
      }
    });
  };

  store.saveFlags = function(flags, callback) {
    const data = utils.extend({}, flags, { $schema: 1 });
    localStorageProvider.set(getFlagsKey(), JSON.stringify(data), err => {
      if (err) {
        logger.warn(messages.localStorageUnavailable());
      }
      callback && callback(err);
    });
  };

  store.clearFlags = function(callback) {
    localStorageProvider.clear(getFlagsKey(), err => {
      if (err) {
        logger.warn(messages.localStorageUnavailable());
      }
      callback && callback(err);
    });
  };

  return store;
}
