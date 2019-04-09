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

  // Returns a Promise which will be resolved with a parsed JSON value if a stored value was available,
  // resolved with null if there was no value, or rejected if storage was not available.
  store.loadFlags = () =>
    new Promise((resolve, reject) => {
      localStorageProvider.get(getFlagsKey(), (err, dataStr) => {
        if (err) {
          logger.warn(messages.localStorageUnavailable());
          reject(err);
        } else {
          if (dataStr === null || dataStr === undefined) {
            resolve(null);
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
            resolve(data);
          } catch (ex) {
            store.clearFlags().then(() => {
              reject(ex);
            });
          }
        }
      });
    });

  // Returns a Promise which will be resolved with no value if successful, or rejected if storage
  // was not available.
  store.saveFlags = flags =>
    new Promise((resolve, reject) => {
      const data = utils.extend({}, flags, { $schema: 1 });
      localStorageProvider.set(getFlagsKey(), JSON.stringify(data), err => {
        if (err) {
          logger.warn(messages.localStorageUnavailable());
          return reject(err);
        }
        resolve();
      });
    });

  // Returns a Promise which will be resolved with no value if successful, or rejected if storage
  // was not available.
  store.clearFlags = () =>
    new Promise((resolve, reject) => {
      localStorageProvider.clear(getFlagsKey(), err => {
        if (err) {
          logger.warn(messages.localStorageUnavailable());
          return reject(err);
        }
        resolve();
      });
    });

  return store;
}
