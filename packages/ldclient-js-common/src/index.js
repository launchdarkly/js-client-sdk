import EventProcessor from './EventProcessor';
import EventEmitter from './EventEmitter';
import Store from './Store';
import Stream from './Stream';
import Requestor from './Requestor';
import Identity from './Identity';
import * as configuration from './configuration';
import * as utils from './utils';
import * as errors from './errors';
import * as messages from './messages';

const readyEvent = 'ready';
const successEvent = 'initialized';
const failedEvent = 'failed';
const changeEvent = 'change';

// This is called by the per-platform initialize functions to create the base client object that we
// may also extend with additional behavior. It returns an object with these properties:
//   client: the actual client object
//   options: the configuration (after any appropriate defaults have been applied)
// If we need to give the platform-specific clients access to any internals here, we should add those
// as properties of the return object, not public properties of the client.
export function initialize(env, user, specifiedOptions, platform, extraDefaults) {
  const emitter = EventEmitter();
  const options = configuration.validate(specifiedOptions, emitter, extraDefaults);
  const hash = options.hash;
  const sendEvents = options.sendEvents;
  const environment = env;
  const stream = Stream(platform, options, environment, hash);
  const events = options.eventProcessor || EventProcessor(platform, options, environment, emitter);
  const requestor = Requestor(platform, options, environment);
  const seenRequests = {};
  let flags = typeof options.bootstrap === 'object' ? readFlagsFromBootstrap(options.bootstrap) : {};
  let useLocalStorage;
  let subscribedToChangeEvents;
  let firstEvent = true;

  function readFlagsFromBootstrap(data) {
    // If the bootstrap data came from an older server-side SDK, we'll have just a map of keys to values.
    // Newer SDKs that have an allFlagsState method will provide an extra "$flagsState" key that contains
    // the rest of the metadata we want. We do it this way for backward compatibility with older JS SDKs.
    const keys = Object.keys(data);
    const metadataKey = '$flagsState';
    const validKey = '$valid';
    const metadata = data[metadataKey];
    if (!metadata && keys.length) {
      console.warn(messages.bootstrapOldFormat());
    }
    if (data[validKey] === false) {
      console.warn(messages.bootstrapInvalid());
    }
    const ret = {};
    keys.forEach(key => {
      if (key !== metadataKey && key !== validKey) {
        let flag = { value: data[key] };
        if (metadata && metadata[key]) {
          flag = utils.extend(flag, metadata[key]);
        } else {
          flag.version = 0;
        }
        ret[key] = flag;
      }
    });
    return ret;
  }

  function shouldEnqueueEvent() {
    return sendEvents && !platform.isDoNotTrack();
  }

  function enqueueEvent(event) {
    if (!event.user) {
      if (firstEvent) {
        if (console && console.warn) {
          console.warn(
            'Be sure to call `identify` in the LaunchDarkly client: http://docs.launchdarkly.com/docs/running-an-ab-test#include-the-client-side-snippet'
          );
        }
        firstEvent = false;
      }
      return;
    }
    firstEvent = false;
    if (shouldEnqueueEvent()) {
      events.enqueue(event);
    }
  }

  function sendIdentifyEvent(user) {
    if (user) {
      enqueueEvent({
        kind: 'identify',
        key: user.key,
        user: user,
        creationDate: new Date().getTime(),
      });
    }
  }

  const ident = Identity(user, sendIdentifyEvent);
  let store;
  if (platform.localStorage) {
    store = new Store(platform.localStorage, environment, hash, ident);
  }

  function sendFlagEvent(key, detail, defaultValue) {
    const user = ident.getUser();
    const now = new Date();
    const value = detail ? detail.value : null;
    if (!options.allowFrequentDuplicateEvents) {
      const cacheKey = JSON.stringify(value) + (user && user.key ? user.key : '') + key; // see below
      const cached = seenRequests[cacheKey];
      // cache TTL is five minutes
      if (cached && now - cached < 300000) {
        return;
      }
      seenRequests[cacheKey] = now;
    }

    const event = {
      kind: 'feature',
      key: key,
      user: user,
      value: value,
      variation: detail ? detail.variationIndex : null,
      default: defaultValue,
      creationDate: now.getTime(),
      reason: detail ? detail.reason : null,
    };
    const flag = flags[key];
    if (flag) {
      event.version = flag.flagVersion ? flag.flagVersion : flag.version;
      event.trackEvents = flag.trackEvents;
      event.debugEventsUntilDate = flag.debugEventsUntilDate;
    }

    enqueueEvent(event);
  }

  function identify(user, hash, onDone) {
    const clearFirst =
      !useLocalStorage || !store ? Promise.resolve() : new Promise(resolve => store.clearFlags(resolve));
    return utils.wrapPromiseCallback(
      clearFirst.then(
        () =>
          new Promise((resolve, reject) => {
            if (!user || user.key === null || user.key === undefined) {
              const err = new errors.LDInvalidUserError(user ? messages.invalidUser() : messages.userNotSpecified());
              emitter.maybeReportError(err);
              reject(err);
            } else {
              ident.setUser(user);
              requestor.fetchFlagSettings(ident.getUser(), hash, (err, settings) => {
                if (err) {
                  emitter.maybeReportError(new errors.LDFlagFetchError(messages.errorFetchingFlags(err)));
                  return reject(err);
                }
                const result = utils.transformVersionedValuesToValues(settings);
                if (settings) {
                  updateSettings(settings, () => {
                    resolve(result);
                  });
                } else {
                  resolve(result);
                }
                if (subscribedToChangeEvents) {
                  connectStream();
                }
              });
            }
        })),
        onDone
    );
  }

  function flush(onDone) {
    return utils.wrapPromiseCallback(
      new Promise(resolve => (sendEvents ? resolve(events.flush()) : resolve()), onDone)
    );
  }

  function variation(key, defaultValue) {
    return variationDetailInternal(key, defaultValue, true).value;
  }

  function variationDetail(key, defaultValue) {
    return variationDetailInternal(key, defaultValue, true);
  }

  function variationDetailInternal(key, defaultValue, sendEvent) {
    let detail;

    if (flags && flags.hasOwnProperty(key) && flags[key] && !flags[key].deleted) {
      const flag = flags[key];
      detail = getFlagDetail(flag);
      if (flag.value === null || flag.value === undefined) {
        detail.value = defaultValue;
      }
    } else {
      detail = { value: defaultValue, variationIndex: null, reason: { kind: 'ERROR', errorKind: 'FLAG_NOT_FOUND' } };
    }

    if (sendEvent) {
      sendFlagEvent(key, detail, defaultValue);
    }

    return detail;
  }

  function getFlagDetail(flag) {
    return {
      value: flag.value,
      variationIndex: flag.variation === undefined ? null : flag.variation,
      reason: flag.reason || null,
    };
    // Note, the logic above ensures that variationIndex and reason will always be null rather than
    // undefined if we don't have values for them. That's just to avoid subtle errors that depend on
    // whether an object was JSON-encoded with null properties omitted or not.
  }

  function allFlags() {
    const results = {};

    if (!flags) {
      return results;
    }

    for (const key in flags) {
      if (flags.hasOwnProperty(key)) {
        results[key] = variationDetailInternal(key, null, !options.sendEventsOnlyForVariation).value;
      }
    }

    return results;
  }

  function track(key, data) {
    if (typeof key !== 'string') {
      emitter.maybeReportError(new errors.LDInvalidEventKeyError(messages.unknownCustomEventKey(key)));
      return;
    }

    if (platform.customEventFilter && !platform.customEventFilter(key)) {
      console.warn(messages.unknownCustomEventKey(key));
    }

    enqueueEvent({
      kind: 'custom',
      key: key,
      data: data,
      user: ident.getUser(),
      url: platform.getCurrentUrl(),
      creationDate: new Date().getTime(),
    });
  }

  function connectStream() {
    if (!ident.getUser()) {
      return;
    }
    stream.connect(ident.getUser(), {
      ping: function() {
        requestor.fetchFlagSettings(ident.getUser(), hash, (err, settings) => {
          if (err) {
            emitter.maybeReportError(new errors.LDFlagFetchError(messages.errorFetchingFlags(err)));
          }
          updateSettings(settings);
        });
      },
      put: function(e) {
        const data = JSON.parse(e.data);
        updateSettings(data);
      },
      patch: function(e) {
        const data = JSON.parse(e.data);
        // If both the flag and the patch have a version property, then the patch version must be
        // greater than the flag version for us to accept the patch.  If either one has no version
        // then the patch always succeeds.
        const oldFlag = flags[data.key];
        if (!oldFlag || !oldFlag.version || !data.version || oldFlag.version < data.version) {
          const mods = {};
          const newFlag = utils.extend({}, data);
          delete newFlag['key'];
          flags[data.key] = newFlag;
          const newDetail = getFlagDetail(newFlag);
          if (oldFlag) {
            mods[data.key] = { previous: oldFlag.value, current: newDetail };
          } else {
            mods[data.key] = { current: newDetail };
          }
          postProcessSettingsUpdate(mods);
        }
      },
      delete: function(e) {
        const data = JSON.parse(e.data);
        if (!flags[data.key] || flags[data.key].version < data.version) {
          const mods = {};
          if (flags[data.key] && !flags[data.key].deleted) {
            mods[data.key] = { previous: flags[data.key].value };
          }
          flags[data.key] = { version: data.version, deleted: true };
          postProcessSettingsUpdate(mods);
        }
      },
    });
  }

  function updateSettings(newFlags, callback) {
    const changes = {};

    if (!newFlags) {
      return;
    }

    for (const key in flags) {
      if (flags.hasOwnProperty(key) && flags[key]) {
        if (newFlags[key] && newFlags[key].value !== flags[key].value) {
          changes[key] = { previous: flags[key].value, current: getFlagDetail(newFlags[key]) };
        } else if (!newFlags[key] || newFlags[key].deleted) {
          changes[key] = { previous: flags[key].value };
        }
      }
    }
    for (const key in newFlags) {
      if (newFlags.hasOwnProperty(key) && newFlags[key] && (!flags[key] || flags[key].deleted)) {
        changes[key] = { current: getFlagDetail(newFlags[key]) };
      }
    }

    flags = newFlags;
    postProcessSettingsUpdate(changes, callback);
  }

  function postProcessSettingsUpdate(changes, callback) {
    const keys = Object.keys(changes);

    if (keys.length > 0) {
      const changeEventParams = {};
      keys.forEach(key => {
        const current = changes[key].current;
        const value = current ? current.value : undefined;
        const previous = changes[key].previous;
        emitter.emit(changeEvent + ':' + key, value, previous);
        changeEventParams[key] = current ? { current: value, previous: previous } : { previous: previous };
      });

      emitter.emit(changeEvent, changeEventParams);

      if (!options.sendEventsOnlyForVariation) {
        keys.forEach(key => {
          sendFlagEvent(key, changes[key].current);
        });
      }
    }

    if (useLocalStorage && store) {
      store.saveFlags(flags, callback);
    } else {
      callback && callback();
    }
  }

  function on(event, handler, context) {
    if (event.substr(0, changeEvent.length) === changeEvent) {
      subscribedToChangeEvents = true;
      if (!stream.isConnected()) {
        connectStream();
      }
      emitter.on.apply(emitter, [event, handler, context]);
    } else {
      emitter.on.apply(emitter, Array.prototype.slice.call(arguments));
    }
  }

  function off(event) {
    if (event === changeEvent) {
      if ((subscribedToChangeEvents = true)) {
        subscribedToChangeEvents = false;
        stream.disconnect();
      }
    }
    emitter.off.apply(emitter, Array.prototype.slice.call(arguments));
  }

  if (!env) {
    utils.onNextTick(() => {
      emitter.maybeReportError(new errors.LDInvalidEnvironmentIdError(messages.environmentNotSpecified()));
    });
  }

  if (!user) {
    utils.onNextTick(() => {
      emitter.maybeReportError(new errors.LDInvalidUserError(messages.userNotSpecified()));
    });
  } else if (!user.key) {
    utils.onNextTick(() => {
      emitter.maybeReportError(new errors.LDInvalidUserError(messages.invalidUser()));
    });
  }

  if (typeof options.bootstrap === 'object') {
    utils.onNextTick(signalSuccessfulInit);
  } else if (typeof options.bootstrap === 'string' && options.bootstrap.toUpperCase() === 'LOCALSTORAGE' && store) {
    useLocalStorage = true;

    store.loadFlags((err, storedFlags) => {
      if (storedFlags === null || storedFlags === undefined) {
        flags = {};
        requestor.fetchFlagSettings(ident.getUser(), hash, (err, requestedFlags) => {
          if (err) {
            const initErr = new errors.LDFlagFetchError(messages.errorFetchingFlags(err));
            signalFailedInit(initErr);
          } else {
            if (requestedFlags) {
              flags = requestedFlags;
              store.saveFlags(flags); // Don't wait for this operation to complete
            } else {
              flags = {};
            }
            signalSuccessfulInit();
          }
        });
      } else {
        // We're reading the flags from local storage. Signal that we're ready,
        // then update localStorage for the next page load. We won't signal changes or update
        // the in-memory flags unless you subscribe for changes
        flags = storedFlags;
        utils.onNextTick(signalSuccessfulInit);

        requestor.fetchFlagSettings(ident.getUser(), hash, (err, requestedFlags) => {
          if (err) {
            emitter.maybeReportError(new errors.LDFlagFetchError(messages.errorFetchingFlags(err)));
          }
          if (requestedFlags) {
            store.saveFlags(requestedFlags, () => {}); // Don't wait for this operation to complete
          }
        });
      }
    });
  } else {
    requestor.fetchFlagSettings(ident.getUser(), hash, (err, requestedFlags) => {
      if (err) {
        flags = {};
        const initErr = new errors.LDFlagFetchError(messages.errorFetchingFlags(err));
        signalFailedInit(initErr);
      } else {
        flags = requestedFlags || {};
        signalSuccessfulInit();
      }
    });
  }

  function signalSuccessfulInit() {
    emitter.emit(readyEvent);
    emitter.emit(successEvent); // allows initPromise to distinguish between success and failure
  }

  function signalFailedInit(err) {
    emitter.maybeReportError(err);
    emitter.emit(failedEvent, err);
    emitter.emit(readyEvent); // for backward compatibility, this event happens even on failure
  }

  function start() {
    if (sendEvents) {
      events.start();
    }
  }

  function stop() {
    if (sendEvents) {
      events.stop();
      events.flush(true);
    }
  }

  const readyPromise = new Promise(resolve => {
    const onReady = emitter.on(readyEvent, () => {
      emitter.off(readyEvent, onReady);
      resolve();
    });
  });

  const initPromise = new Promise((resolve, reject) => {
    const onSuccess = emitter.on(successEvent, () => {
      emitter.off(successEvent, onSuccess);
      resolve();
    });
    const onFailure = emitter.on(failedEvent, err => {
      emitter.off(failedEvent, onFailure);
      reject(err);
    });
  });

  const client = {
    waitForInitialization: () => initPromise,
    waitUntilReady: () => readyPromise,
    identify: identify,
    variation: variation,
    variationDetail: variationDetail,
    track: track,
    on: on,
    off: off,
    flush: flush,
    allFlags: allFlags,
  };

  return {
    client: client, // The client object containing all public methods.
    options: options, // The validated configuration object, including all defaults.
    emitter: emitter, // The event emitter which can be used to log errors or trigger events.
    ident: ident, // The Identity object that manages the current user.
    requestor: requestor, // The Requestor object.
    start: start, // Starts the client once the environment is ready.
    stop: stop, // Shuts down the client.
    enqueueEvent: enqueueEvent, // Puts an analytics event in the queue, if event sending is enabled.
  };
}

export const version = VERSION;
export { errors };
export { messages };
export { utils };
