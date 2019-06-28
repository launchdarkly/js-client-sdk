import EventProcessor from './EventProcessor';
import EventEmitter from './EventEmitter';
import Store from './Store';
import Stream from './Stream';
import Requestor from './Requestor';
import Identity from './Identity';
import UserValidator from './UserValidator';
import * as configuration from './configuration';
import createConsoleLogger from './consoleLogger';
import * as utils from './utils';
import * as errors from './errors';
import * as messages from './messages';

const readyEvent = 'ready';
const successEvent = 'initialized';
const failedEvent = 'failed';
const changeEvent = 'change';
const internalChangeEvent = 'internal-change';

// This is called by the per-platform initialize functions to create the base client object that we
// may also extend with additional behavior. It returns an object with these properties:
//   client: the actual client object
//   options: the configuration (after any appropriate defaults have been applied)
// If we need to give the platform-specific clients access to any internals here, we should add those
// as properties of the return object, not public properties of the client.
//
// For definitions of the API in the platform object, see stubPlatform.js in the test code.

export function initialize(env, user, specifiedOptions, platform, extraDefaults) {
  const logger = createLogger();
  const emitter = EventEmitter(logger);
  const options = configuration.validate(specifiedOptions, emitter, extraDefaults, logger);
  const hash = options.hash;
  const sendEvents = options.sendEvents;
  let environment = env;
  const stream = Stream(platform, options, environment, hash);
  const events = options.eventProcessor || EventProcessor(platform, options, environment, emitter);
  const requestor = Requestor(platform, options, environment);
  const seenRequests = {};
  let flags = {};
  let useLocalStorage;
  let streamActive;
  let streamForcedState = options.streaming;
  let subscribedToChangeEvents;
  let inited = false;
  let closed = false;
  let firstEvent = true;

  // The "stateProvider" object is used in the Electron SDK, to allow one client instance to take partial
  // control of another. If present, it has the following contract:
  // - getInitialState() returns the initial client state if it is already available. The state is an
  //   object whose properties are "environment", "user", and "flags".
  // - on("init", listener) triggers an event when the initial client state becomes available, passing
  //   the state object to the listener.
  // - on("update", listener) triggers an event when flag values change and/or the current user changes.
  //   The parameter is an object that *may* contain "user" and/or "flags".
  // - enqueueEvent(event) accepts an analytics event object and returns true if the stateProvider will
  //   be responsible for delivering it, or false if we still should deliver it ourselves.
  const stateProvider = options.stateProvider;

  const ident = Identity(null, sendIdentifyEvent);
  const userValidator = UserValidator(platform.localStorage, logger);
  let store;
  if (platform.localStorage) {
    store = new Store(platform.localStorage, environment, hash, ident, logger);
  }

  function createLogger() {
    if (specifiedOptions && specifiedOptions.logger) {
      return specifiedOptions.logger;
    }
    return (extraDefaults && extraDefaults.logger) || createConsoleLogger('warn');
  }

  function readFlagsFromBootstrap(data) {
    // If the bootstrap data came from an older server-side SDK, we'll have just a map of keys to values.
    // Newer SDKs that have an allFlagsState method will provide an extra "$flagsState" key that contains
    // the rest of the metadata we want. We do it this way for backward compatibility with older JS SDKs.
    const keys = Object.keys(data);
    const metadataKey = '$flagsState';
    const validKey = '$valid';
    const metadata = data[metadataKey];
    if (!metadata && keys.length) {
      logger.warn(messages.bootstrapOldFormat());
    }
    if (data[validKey] === false) {
      logger.warn(messages.bootstrapInvalid());
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
    return sendEvents && !closed && !platform.isDoNotTrack();
  }

  function enqueueEvent(event) {
    if (!environment) {
      // We're in paired mode and haven't been initialized with an environment or user yet
      return;
    }
    if (stateProvider && stateProvider.enqueueEvent && stateProvider.enqueueEvent(event)) {
      return; // it'll be handled elsewhere
    }
    if (!event.user) {
      if (firstEvent) {
        logger.warn(messages.eventWithoutUser());
        firstEvent = false;
      }
      return;
    }
    firstEvent = false;
    if (shouldEnqueueEvent()) {
      logger.debug(messages.debugEnqueueingEvent(event.kind));
      events.enqueue(event);
    }
  }

  function sendIdentifyEvent(user) {
    if (stateProvider) {
      // In paired mode, the other client is responsible for sending identify events
      return;
    }
    if (user) {
      enqueueEvent({
        kind: 'identify',
        key: user.key,
        user: user,
        creationDate: new Date().getTime(),
      });
    }
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
    if (closed) {
      return utils.wrapPromiseCallback(Promise.resolve({}), onDone);
    }
    if (stateProvider) {
      // We're being controlled by another client instance, so only that instance is allowed to change the user
      logger.warn(messages.identifyDisabled());
      return utils.wrapPromiseCallback(Promise.resolve(utils.transformVersionedValuesToValues(flags)), onDone);
    }
    const clearFirst = useLocalStorage && store ? store.clearFlags() : Promise.resolve();
    return utils.wrapPromiseCallback(
      clearFirst
        .then(() => userValidator.validateUser(user))
        .then(realUser => ident.setUser(realUser))
        .then(() => requestor.fetchFlagSettings(ident.getUser(), hash))
        .then(requestedFlags => {
          const flagValueMap = utils.transformVersionedValuesToValues(requestedFlags);
          if (requestedFlags) {
            return replaceAllFlags(requestedFlags).then(() => flagValueMap);
          } else {
            return flagValueMap;
          }
        })
        .then(flagValueMap => {
          if (streamActive) {
            connectStream();
          }
          return flagValueMap;
        })
        .catch(err => {
          emitter.maybeReportError(err);
          return Promise.reject(err);
        }),
      onDone
    );
  }

  function getUser() {
    return ident.getUser();
  }

  function flush(onDone) {
    return utils.wrapPromiseCallback(sendEvents ? events.flush() : Promise.resolve(), onDone);
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
      logger.warn(messages.unknownCustomEventKey(key));
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
    streamActive = true;
    if (!ident.getUser()) {
      return;
    }
    stream.connect(ident.getUser(), {
      ping: function() {
        logger.debug(messages.debugStreamPing());
        requestor
          .fetchFlagSettings(ident.getUser(), hash)
          .then(requestedFlags => replaceAllFlags(requestedFlags || {}))
          .catch(err => {
            emitter.maybeReportError(new errors.LDFlagFetchError(messages.errorFetchingFlags(err)));
          });
      },
      put: function(e) {
        const data = JSON.parse(e.data);
        logger.debug(messages.debugStreamPut());
        replaceAllFlags(data); // don't wait for this Promise to be resolved
      },
      patch: function(e) {
        const data = JSON.parse(e.data);
        // If both the flag and the patch have a version property, then the patch version must be
        // greater than the flag version for us to accept the patch.  If either one has no version
        // then the patch always succeeds.
        const oldFlag = flags[data.key];
        if (!oldFlag || !oldFlag.version || !data.version || oldFlag.version < data.version) {
          logger.debug(messages.debugStreamPatch(data.key));
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
          handleFlagChanges(mods); // don't wait for this Promise to be resolved
        } else {
          logger.debug(messages.debugStreamPatchIgnored(data.key));
        }
      },
      delete: function(e) {
        const data = JSON.parse(e.data);
        if (!flags[data.key] || flags[data.key].version < data.version) {
          logger.debug(messages.debugStreamDelete(data.key));
          const mods = {};
          if (flags[data.key] && !flags[data.key].deleted) {
            mods[data.key] = { previous: flags[data.key].value };
          }
          flags[data.key] = { version: data.version, deleted: true };
          handleFlagChanges(mods); // don't wait for this Promise to be resolved
        } else {
          logger.debug(messages.debugStreamDeleteIgnored(data.key));
        }
      },
    });
  }

  function disconnectStream() {
    if (streamActive) {
      stream.disconnect();
      streamActive = false;
    }
  }

  // Returns a Promise which will be resolved when we have completely updated the internal flags state,
  // dispatched all change events, and updated local storage if appropriate. This Promise is guaranteed
  // never to have an unhandled rejection.
  function replaceAllFlags(newFlags) {
    const changes = {};

    if (!newFlags) {
      return Promise.resolve();
    }

    for (const key in flags) {
      if (flags.hasOwnProperty(key) && flags[key]) {
        if (newFlags[key] && !utils.deepEquals(newFlags[key].value, flags[key].value)) {
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
    return handleFlagChanges(changes).catch(() => {}); // swallow any exceptions from this Promise
  }

  // Returns a Promise which will be resolved when we have dispatched all change events and updated
  // local storage if appropriate.
  function handleFlagChanges(changes) {
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
      emitter.emit(internalChangeEvent, flags);

      // By default, we send feature evaluation events whenever we have received new flag values -
      // the client has in effect evaluated these flags just by receiving them. This can be suppressed
      // by setting "sendEventsOnlyForVariation". Also, if we have a stateProvider, we don't send these
      // events because we assume they have already been sent by the other client that gave us the flags
      // (when it received them in the first place).
      if (!options.sendEventsOnlyForVariation && !stateProvider) {
        keys.forEach(key => {
          sendFlagEvent(key, changes[key].current);
        });
      }
    }

    if (useLocalStorage && store) {
      return store.saveFlags(flags).catch(() => null); // disregard errors
    } else {
      return Promise.resolve();
    }
  }

  function on(event, handler, context) {
    if (isChangeEventKey(event)) {
      subscribedToChangeEvents = true;
      if (inited) {
        updateStreamingState();
      }
      emitter.on(event, handler, context);
    } else {
      emitter.on(...arguments);
    }
  }

  function off(event) {
    emitter.off(...arguments);
    if (isChangeEventKey(event)) {
      let haveListeners = false;
      emitter.getEvents().forEach(key => {
        if (isChangeEventKey(key) && emitter.getEventListenerCount(key) > 0) {
          haveListeners = true;
        }
      });
      if (!haveListeners) {
        subscribedToChangeEvents = false;
        if (streamActive && streamForcedState === undefined) {
          disconnectStream();
        }
      }
    }
  }

  function setStreaming(state) {
    const newState = state === null ? undefined : state;
    if (newState !== streamForcedState) {
      streamForcedState = newState;
      updateStreamingState();
    }
  }

  function updateStreamingState() {
    const shouldBeStreaming = streamForcedState || (subscribedToChangeEvents && streamForcedState === undefined);
    if (shouldBeStreaming && !streamActive) {
      connectStream();
    } else if (!shouldBeStreaming && streamActive) {
      disconnectStream();
    }
  }

  function isChangeEventKey(event) {
    return event === changeEvent || event.substr(0, changeEvent.length + 1) === changeEvent + ':';
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

  if (typeof options.bootstrap === 'string' && options.bootstrap.toUpperCase() === 'LOCALSTORAGE') {
    if (store) {
      useLocalStorage = true;
    } else {
      logger.warn(messages.localStorageUnavailable());
    }
  }

  if (stateProvider) {
    // The stateProvider option is used in the Electron SDK, to allow a client instance in the main process
    // to control another client instance (i.e. this one) in the renderer process. We can't predict which
    // one will start up first, so the initial state may already be available for us or we may have to wait
    // to receive it.
    const state = stateProvider.getInitialState();
    if (state) {
      initFromStateProvider(state);
    } else {
      stateProvider.on('init', initFromStateProvider);
    }
    stateProvider.on('update', updateFromStateProvider);
  } else {
    finishInit().catch(err => emitter.maybeReportError(err));
  }

  function finishInit() {
    if (!env) {
      return Promise.reject(new errors.LDInvalidEnvironmentIdError(messages.environmentNotSpecified()));
    }
    return userValidator.validateUser(user).then(realUser => {
      ident.setUser(realUser);
      if (typeof options.bootstrap === 'object') {
        flags = readFlagsFromBootstrap(options.bootstrap);
        return signalSuccessfulInit();
      } else if (useLocalStorage) {
        return finishInitWithLocalStorage();
      } else {
        return finishInitWithPolling();
      }
    });
  }

  function finishInitWithLocalStorage() {
    return store
      .loadFlags()
      .catch(() => null) // treat an error the same as if no flags were available
      .then(storedFlags => {
        if (storedFlags === null || storedFlags === undefined) {
          flags = {};
          return requestor
            .fetchFlagSettings(ident.getUser(), hash)
            .then(requestedFlags => replaceAllFlags(requestedFlags || {}))
            .then(signalSuccessfulInit)
            .catch(err => {
              const initErr = new errors.LDFlagFetchError(messages.errorFetchingFlags(err));
              signalFailedInit(initErr);
            });
        } else {
          // We're reading the flags from local storage. Signal that we're ready,
          // then update localStorage for the next page load. We won't signal changes or update
          // the in-memory flags unless you subscribe for changes
          flags = storedFlags;
          utils.onNextTick(signalSuccessfulInit);

          return requestor
            .fetchFlagSettings(ident.getUser(), hash)
            .then(requestedFlags => replaceAllFlags(requestedFlags))
            .catch(err => emitter.maybeReportError(err));
        }
      });
  }

  function finishInitWithPolling() {
    return requestor
      .fetchFlagSettings(ident.getUser(), hash)
      .then(requestedFlags => {
        flags = requestedFlags || {};
        // Note, we don't need to call updateSettings here because local storage and change events are not relevant
        signalSuccessfulInit();
      })
      .catch(err => {
        flags = {};
        signalFailedInit(err);
      });
  }

  function initFromStateProvider(state) {
    environment = state.environment;
    ident.setUser(state.user);
    flags = state.flags;
    utils.onNextTick(signalSuccessfulInit);
  }

  function updateFromStateProvider(state) {
    if (state.user) {
      ident.setUser(state.user);
    }
    if (state.flags) {
      replaceAllFlags(state.flags); // don't wait for this Promise to be resolved
    }
  }

  function signalSuccessfulInit() {
    logger.info(messages.clientInitialized());
    inited = true;
    updateStreamingState();
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

  function close(onDone) {
    if (closed) {
      return utils.wrapPromiseCallback(Promise.resolve(), onDone);
    }
    const finishClose = () => {
      closed = true;
      flags = {};
    };
    const p = Promise.resolve()
      .then(() => {
        disconnectStream();
        if (sendEvents) {
          events.stop();
          return events.flush();
        }
      })
      .then(finishClose)
      .catch(finishClose);
    return utils.wrapPromiseCallback(p, onDone);
  }

  function getFlagsInternal() {
    // used by Electron integration
    return flags;
  }

  const client = {
    waitForInitialization: () => initPromise,
    waitUntilReady: () => readyPromise,
    identify: identify,
    getUser: getUser,
    variation: variation,
    variationDetail: variationDetail,
    track: track,
    on: on,
    off: off,
    setStreaming: setStreaming,
    flush: flush,
    allFlags: allFlags,
    close: close,
  };

  return {
    client: client, // The client object containing all public methods.
    options: options, // The validated configuration object, including all defaults.
    emitter: emitter, // The event emitter which can be used to log errors or trigger events.
    ident: ident, // The Identity object that manages the current user.
    logger: logger, // The logging abstraction.
    requestor: requestor, // The Requestor object.
    start: start, // Starts the client once the environment is ready.
    enqueueEvent: enqueueEvent, // Puts an analytics event in the queue, if event sending is enabled.
    getFlagsInternal: getFlagsInternal, // Returns flag data structure with all details.
    getEnvironmentId: () => environment, // Gets the environment ID (this may have changed since initialization, if we have a state provider)
    internalChangeEventName: internalChangeEvent, // This event is triggered whenever we have new flag state.
  };
}

export const version = VERSION;
export { createConsoleLogger };
export { errors };
export { messages };
export { utils };
