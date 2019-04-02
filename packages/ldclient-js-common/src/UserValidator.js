import uuidv1 from 'uuid/v1';

import * as errors from './errors';
import * as messages from './messages';
import * as utils from './utils';

// Transforms the user object if necessary to make sure it has a valid key. Returns a Promise that
// provides either the valid user object or an error.
// 1. If a key is present, but is not a string, change it to a string.
// 2. If no key is present, and "anonymous" is true, use a UUID as a key. This is cached in local
// storage if possible.
// 3. If there is no key (or no user object), return an error.

const ldUserIdKey = 'ld:$anonUserId';

export default function UserValidator(localStorageProvider, logger) {
  function getCachedUserId(cb) {
    if (localStorageProvider) {
      localStorageProvider.get(ldUserIdKey, (err, data) => {
        cb(err ? null : data);
        // Not logging errors here, because if local storage fails for the get, it will presumably fail for the set,
        // so we will end up logging an error in setCachedUserId anyway.
      });
    } else {
      cb(null);
    }
  }

  function setCachedUserId(id, cb) {
    if (localStorageProvider) {
      localStorageProvider.set(ldUserIdKey, id, err => {
        logger.warn(messages.localStorageUnavailableForUserId());
        cb();
      });
    } else {
      cb();
    }
  }

  const ret = {};
  ret.validateUser = (user, cb) => {
    if (!user) {
      cb(new errors.LDInvalidUserError(messages.userNotSpecified()));
      return;
    }

    const sane = utils.clone(user);
    if (sane.key) {
      sane.key = sane.key.toString();
    }
    if (!sane.key) {
      if (sane.anonymous) {
        getCachedUserId(cachedId => {
          if (cachedId) {
            sane.key = cachedId;
            cb(null, sane);
          } else {
            const id = uuidv1();
            sane.key = id;
            setCachedUserId(id, () => {
              cb(null, sane);
            });
          }
        });
      } else {
        cb(new errors.LDInvalidUserError(messages.invalidUser()));
      }
    } else {
      cb(null, sane);
    }
  };

  return ret;
}
