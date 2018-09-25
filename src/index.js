import EventProcessor from './EventProcessor';
import EventEmitter from './EventEmitter';
import GoalTracker from './GoalTracker';
import Store from './Store';
import Stream from './Stream';
import Requestor from './Requestor';
import Identity from './Identity';
import * as utils from './utils';
import * as messages from './messages';
import * as errors from './errors';

const readyEvent = 'ready';
const successEvent = 'initialized';
const failedEvent = 'failed';
const changeEvent = 'change';
const goalsEvent = 'goalsReady';
const locationWatcherInterval = 300;

export function initialize(env, user, options = {}) {
  const baseUrl = options.baseUrl || 'https://app.launchdarkly.com';
  const eventsUrl = options.eventsUrl || 'https://events.launchdarkly.com';
  const streamUrl = options.streamUrl || 'https://clientstream.launchdarkly.com';
  const hash = options.hash;
  const sendEvents = optionWithDefault('sendEvents', true);
  const sendLDHeaders = optionWithDefault('sendLDHeaders', true);
  const allowFrequentDuplicateEvents = !!options.allowFrequentDuplicateEvents;
  const sendEventsOnlyForVariation = !!options.sendEventsOnlyForVariation;
  const fetchGoals = typeof options.fetchGoals === 'undefined' ? true : options.fetchGoals;
  const environment = env;
  const emitter = EventEmitter();
  const stream = Stream(streamUrl, environment, hash, options);
  const events =
    options.eventProcessor || EventProcessor(eventsUrl, environment, options, emitter, null, sendLDHeaders);
  const requestor = Requestor(baseUrl, environment, options.useReport, options.evaluationReasons, sendLDHeaders);
  const seenRequests = {};
  let flags = typeof options.bootstrap === 'object' ? readFlagsFromBootstrap(options.bootstrap) : {};
  let goalTracker;
  let useLocalStorage;
  let goals;
  let subscribedToChangeEvents;
  let firstEvent = true;

  function optionWithDefault(name, defaultVal) {
    return typeof options[name] === 'undefined' ? defaultVal : options[name];
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
    return sendEvents && !doNotTrack();
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
  const store = Store(environment, hash, ident);

  function sendFlagEvent(key, detail, defaultValue) {
    const user = ident.getUser();
    const now = new Date();
    const value = detail ? detail.value : null;
    if (!allowFrequentDuplicateEvents) {
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

  function sendGoalEvent(kind, goal) {
    const event = {
      kind: kind,
      key: goal.key,
      data: null,
      url: window.location.href,
      user: ident.getUser(),
      creationDate: new Date().getTime(),
    };

    if (kind === 'click') {
      event.selector = goal.selector;
    }

    return enqueueEvent(event);
  }

  function identify(user, hash, onDone) {
    if (useLocalStorage) {
      store.clearFlags();
    }
    return utils.wrapPromiseCallback(
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
            if (settings) {
              updateSettings(settings);
            }
            resolve(utils.transformVersionedValuesToValues(settings));
            if (subscribedToChangeEvents) {
              connectStream();
            }
          });
        }
      }),
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

  function doNotTrack() {
    let flag;
    if (navigator && navigator.doNotTrack !== undefined) {
      flag = navigator.doNotTrack; // FF, Chrome
    } else if (navigator && navigator.msDoNotTrack !== undefined) {
      flag = navigator.msDoNotTrack; // IE 9/10
    } else {
      flag = window.doNotTrack; // IE 11+, Safari
    }
    return flag === '1' || flag === 'yes';
  }

  function allFlags() {
    const results = {};

    if (!flags) {
      return results;
    }

    for (const key in flags) {
      if (flags.hasOwnProperty(key)) {
        results[key] = variationDetailInternal(key, null, !sendEventsOnlyForVariation).value;
      }
    }

    return results;
  }

  function customEventExists(key) {
    if (!goals || goals.length === 0) {
      return false;
    }

    for (let i = 0; i < goals.length; i++) {
      if (goals[i].kind === 'custom' && goals[i].key === key) {
        return true;
      }
    }

    return false;
  }

  function track(key, data) {
    if (typeof key !== 'string') {
      emitter.maybeReportError(new errors.LDInvalidEventKeyError(messages.unknownCustomEventKey(key)));
      return;
    }

    // Validate key if we have goals
    if (!!goals && !customEventExists(key)) {
      console.warn(messages.unknownCustomEventKey(key));
    }

    enqueueEvent({
      kind: 'custom',
      key: key,
      data: data,
      user: ident.getUser(),
      url: window.location.href,
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

  function updateSettings(newFlags) {
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
    postProcessSettingsUpdate(changes);
  }

  function postProcessSettingsUpdate(changes) {
    const keys = Object.keys(changes);

    if (useLocalStorage) {
      store.saveFlags(flags);
    }

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

      if (!sendEventsOnlyForVariation) {
        keys.forEach(key => {
          sendFlagEvent(key, changes[key].current);
        });
      }
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

  function handleMessage(event) {
    if (event.origin !== baseUrl) {
      return;
    }
    if (event.data.type === 'SYN') {
      window.editorClientBaseUrl = baseUrl;
      const editorTag = document.createElement('script');
      editorTag.type = 'text/javascript';
      editorTag.async = true;
      editorTag.src = baseUrl + event.data.editorClientUrl;
      const s = document.getElementsByTagName('script')[0];
      s.parentNode.insertBefore(editorTag, s);
    }
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
  } else if (
    typeof options.bootstrap === 'string' &&
    options.bootstrap.toUpperCase() === 'LOCALSTORAGE' &&
    !!localStorage
  ) {
    useLocalStorage = true;

    flags = store.loadFlags();

    if (flags === null) {
      flags = {};
      requestor.fetchFlagSettings(ident.getUser(), hash, (err, settings) => {
        if (err) {
          const initErr = new errors.LDFlagFetchError(messages.errorFetchingFlags(err));
          signalFailedInit(initErr);
        } else {
          if (settings) {
            flags = settings;
            store.saveFlags(flags);
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
      utils.onNextTick(signalSuccessfulInit);

      requestor.fetchFlagSettings(ident.getUser(), hash, (err, settings) => {
        if (err) {
          emitter.maybeReportError(new errors.LDFlagFetchError(messages.errorFetchingFlags(err)));
        }
        if (settings) {
          store.saveFlags(settings);
        }
      });
    }
  } else {
    requestor.fetchFlagSettings(ident.getUser(), hash, (err, settings) => {
      if (err) {
        flags = {};
        const initErr = new errors.LDFlagFetchError(messages.errorFetchingFlags(err));
        signalFailedInit(initErr);
      } else {
        flags = settings || {};
        signalSuccessfulInit();
      }
    });
  }

  function refreshGoalTracker() {
    if (goalTracker) {
      goalTracker.dispose();
    }
    if (goals && goals.length) {
      goalTracker = GoalTracker(goals, sendGoalEvent);
    }
  }

  function watchLocation(interval, callback) {
    let previousUrl = location.href;
    let currentUrl;

    function checkUrl() {
      currentUrl = location.href;

      if (currentUrl !== previousUrl) {
        previousUrl = currentUrl;
        callback();
      }
    }

    function poll(fn, interval) {
      fn();
      setTimeout(() => {
        poll(fn, interval);
      }, interval);
    }

    poll(checkUrl, interval);

    if (!!(window.history && history.pushState)) {
      window.addEventListener('popstate', checkUrl);
    } else {
      window.addEventListener('hashchange', checkUrl);
    }
  }

  if (fetchGoals) {
    requestor.fetchGoals((err, g) => {
      if (err) {
        emitter.maybeReportError(
          new errors.LDUnexpectedResponseError('Error fetching goals: ' + err.message ? err.message : err)
        );
      }
      if (g && g.length > 0) {
        goals = g;
        goalTracker = GoalTracker(goals, sendGoalEvent);
        watchLocation(locationWatcherInterval, refreshGoalTracker);
      }
      emitter.emit(goalsEvent);
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

  if (document.readyState !== 'complete') {
    window.addEventListener('load', start);
  } else {
    start();
  }

  window.addEventListener('beforeunload', () => {
    if (sendEvents) {
      events.stop();
      events.flush(true);
    }
  });

  window.addEventListener('message', handleMessage);

  const readyPromise = new Promise(resolve => {
    const onReady = emitter.on(readyEvent, () => {
      emitter.off(readyEvent, onReady);
      resolve();
    });
  });

  const goalsPromise = new Promise(resolve => {
    const onGoals = emitter.on(goalsEvent, () => {
      emitter.off(goalsEvent, onGoals);
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
    waitUntilGoalsReady: () => goalsPromise,
    identify: identify,
    variation: variation,
    variationDetail: variationDetail,
    track: track,
    on: on,
    off: off,
    flush: flush,
    allFlags: allFlags,
  };

  return client;
}

export const version = VERSION;

function deprecatedInitialize(env, user, options = {}) {
  console && console.warn && console.warn(messages.deprecated('default export', 'named LDClient export'));
  return initialize(env, user, options);
}

export default { initialize: deprecatedInitialize, version };
