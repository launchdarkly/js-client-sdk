import * as common from 'ldclient-js-common';

// This simply wraps the regular Electron client in an API that is more like the Node SDK, to assist
// developers who are transitioning from the Node SDK.
//
// Note that since the underlying client still uses the single-current-user client-side model, we
// have to call identify() prior to every flag evaluation. Therefore, this will perform very poorly
// if for some reason you try to evaluate flags for a bunch of different users.

export function createNodeSdkAdapter(realClient) {
  let initComplete = false;

  realClient.on('ready', () => {
    initComplete = true;
  });

  function maybeChangeUser(user) {
    if (user && realClient.getUser() && common.utils.deepEquals(user, realClient.getUser())) {
      return Promise.resolve();
    }
    return realClient.identify(user);
  }

  function withUserAsync(user, callback, resultFn) {
    return common.utils.wrapPromiseCallback(maybeChangeUser(user).then(() => resultFn()), callback);
  }

  const wrapper = {
    initialized: () => initComplete,

    // In the Node SDK, waitUntilReady() is a deprecated method that resolves its Promise if
    // initialization succeeds *or fails*.
    waitUntilReady: () => realClient.waitForInitialization().catch(() => Promise.resolve()),

    waitForInitialization: () => realClient.waitForInitialization().then(() => wrapper),

    variation: (key, user, defaultVal, callback) =>
      withUserAsync(user, callback, () => realClient.variation(key, defaultVal)),

    variationDetail: (key, user, defaultVal, callback) =>
      withUserAsync(user, callback, () => realClient.variationDetail(key, defaultVal)),

    allFlags: (user, callback) => withUserAsync(user, callback, () => realClient.allFlags()),

    allFlagsState: (user, callback) => withUserAsync(user, callback, () => realClient.allFlagsState()),

    track: (eventName, user, data) =>
      // Note that track() does not actually return a Promise in the Node SDK, but it's helpful for testing
      withUserAsync(user, null, () => {
        realClient.track(eventName, data);
      }).catch(() => {}), // suppress errors because the Promise will not normally be used

    identify: user => {
      realClient.identify(user).catch(() => {});
    },

    secureModeHash: () => {
      console.warn('LDClient.secureModeHash is not supported in the Electron SDK');
      return '';
    },

    close: () => realClient.close(),

    // TODO: we don't currently have an offline mode
    isOffline: () => false,

    flush: callback => realClient.flush(callback),

    on: (...args) => realClient.on(...args),

    off: (...args) => realClient.off(...args),
  };

  return wrapper;
}
