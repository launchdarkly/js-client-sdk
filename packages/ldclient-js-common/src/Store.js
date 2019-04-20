import * as messages from './messages';
import * as utils from './utils';

// The localStorageProvider is provided by the platform object. It should have the following
// methods, each of which should return a Promise:
// - get(key): Gets the string value, if any, for the given key
// - set(key, value): Stores a string value for the given key
// - remove(key): Removes the given key
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
    localStorageProvider
      .get(getFlagsKey())
      .then(dataStr => {
        if (dataStr === null || dataStr === undefined) {
          return null;
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
          return data;
        } catch (ex) {
          return store.clearFlags().then(() => Promise.reject(ex));
        }
      })
      .catch(err => {
        logger.warn(messages.localStorageUnavailable());
        return Promise.reject(err);
      });

  // Returns a Promise which will be resolved with no value if successful, or rejected if storage
  // was not available.
  store.saveFlags = flags => {
    const data = utils.extend({}, flags, { $schema: 1 });
    return localStorageProvider.set(getFlagsKey(), JSON.stringify(data)).catch(err => {
      logger.warn(messages.localStorageUnavailable());
      return Promise.reject(err);
    });
  };

  // Returns a Promise which will be resolved with no value if successful, or rejected if storage
  // was not available.
  store.clearFlags = () =>
    localStorageProvider.clear(getFlagsKey()).catch(err => {
      logger.warn(messages.localStorageUnavailable());
      return Promise.reject(err);
    });

  return store;
}
