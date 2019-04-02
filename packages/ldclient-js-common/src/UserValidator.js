import uuidv1 from 'uuid/v1';

import * as errors from './errors';
import * as messages from './messages';
import * as utils from './utils';

// Transforms the user object if necessary to make sure it has a valid key. Takes a callback that will
// be called with (err, validatedUser).
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
        if (err) {
          logger.warn(messages.localStorageUnavailableForUserId());
        }
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

    const userOut = utils.clone(user);
    if (userOut.key !== null && userOut.key !== undefined) {
      userOut.key = userOut.key.toString();
      cb(null, userOut);
      return;
    }
    if (userOut.anonymous) {
      getCachedUserId(cachedId => {
        if (cachedId) {
          userOut.key = cachedId;
          cb(null, userOut);
        } else {
          const id = uuidv1();
          userOut.key = id;
          setCachedUserId(id, () => {
            cb(null, userOut);
          });
        }
      });
    } else {
      cb(new errors.LDInvalidUserError(messages.invalidUser()));
    }
  };

  return ret;
}
