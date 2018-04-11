import EventProcessor from './EventProcessor';
import EventEmitter from './EventEmitter';
import EventSerializer from './EventSerializer';
import GoalTracker from './GoalTracker';
import Stream from './Stream';
import Requestor from './Requestor';
import Identity from './Identity';
import store from './store';
import * as utils from './utils';
import * as messages from './messages';
import * as errors from './errors';

const readyEvent = 'ready';
const changeEvent = 'change';
const flushInterval = 2000;
const locationWatcherInterval = 300;

function initialize(env, user, options = {}) {
  const baseUrl = options.baseUrl || 'https://app.launchdarkly.com';
  const eventsUrl = options.eventsUrl || 'https://events.launchdarkly.com';
  const streamUrl = options.streamUrl || 'https://clientstream.launchdarkly.com';
  const hash = options.hash;
  const sendEvents = typeof options.sendEvents === 'undefined' ? true : config.sendEvents;
  const environment = env;
  const emitter = EventEmitter();
  const stream = Stream(streamUrl, environment, hash, options.useReport);
  const events = EventProcessor(eventsUrl + '/a/' + environment + '.gif', EventSerializer(options));
  const requestor = Requestor(baseUrl, environment, options.useReport);
  const seenRequests = {};
  let samplingInterval = parseInt(options.samplingInterval, 10) || 0;
  let flags = typeof options.bootstrap === 'object' ? utils.transformValuesToVersionedValues(options.bootstrap) : {};
  let goalTracker;
  let useLocalStorage;
  let goals;
  let subscribedToChangeEvents;

  function lsKey(env, user) {
    let key = '';
    if (user) {
      key = hash || utils.btoa(JSON.stringify(user));
    }
    return 'ld:' + env + ':' + key;
  }

  function shouldEnqueueEvent() {
    return (
      sendEvents && !doNotTrack() && (samplingInterval === 0 || Math.floor(Math.random() * samplingInterval) === 0)
    );
  }

  function enqueueEvent(event) {
    if (shouldEnqueueEvent()) {
      events.enqueue(event);
    }
  }

  function sendIdentifyEvent(user) {
    enqueueEvent({
      kind: 'identify',
      key: user.key,
      user: user,
      creationDate: new Date().getTime(),
    });
  }

  const ident = Identity(user, sendIdentifyEvent);
  let localStorageKey = lsKey(environment, ident.getUser());

  function sendFlagEvent(key, value, defaultValue) {
    const user = ident.getUser();
    const cacheKey = JSON.stringify(value) + (user && user.key ? user.key : '') + key;
    const now = new Date();
    const cached = seenRequests[cacheKey];

    if (cached && now - cached < 300000 /* five minutes, in ms */) {
      return;
    }

    seenRequests[cacheKey] = now;

    enqueueEvent({
      kind: 'feature',
      key: key,
      user: user,
      value: value,
      default: defaultValue,
      creationDate: now.getTime(),
    });
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
    return utils.wrapPromiseCallback(
      new Promise((resolve, reject) => {
        ident.setUser(user);
        requestor.fetchFlagSettings(ident.getUser(), hash, (err, settings) => {
          if (err) {
            emitter.maybeReportError(new errors.LDFlagFetchError(messages.errorFetchingFlags(err)));
            return reject(err);
          }
          if (settings) {
            updateSettings(settings);
          }
          resolve(settings);
          if (subscribedToChangeEvents) {
            connectStream();
          }
        });
      }),
      onDone
    );
  }

  function flush(onDone) {
    return utils.wrapPromiseCallback(
      new Promise(resolve => (sendEvents ? resolve(events.flush(ident.getUser())) : resolve()), onDone)
    );
  }

  function variation(key, defaultValue) {
    let value;

    if (flags && flags.hasOwnProperty(key) && !flags[key].deleted) {
      value = flags[key].value === null ? defaultValue : flags[key].value;
    } else {
      value = defaultValue;
    }

    sendFlagEvent(key, value, defaultValue);

    return value;
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
        results[key] = variation(key, null);
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
    stream.disconnect();
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
        if (!flags[data.key] || flags[data.key].version < data.version) {
          const mods = {};
          const oldFlag = flags[data.key];
          flags[data.key] = { version: data.version, value: data.value };
          if (oldFlag) {
            mods[data.key] = { previous: oldFlag.value, current: data.value };
          } else {
            mods[data.key] = { current: data.value };
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
      if (flags.hasOwnProperty(key)) {
        if (newFlags[key] && newFlags[key].value !== flags[key].value) {
          changes[key] = { previous: flags[key].value, current: newFlags[key].value };
        } else if (!newFlags[key] || newFlags[key].deleted) {
          changes[key] = { previous: flags[key].value };
        }
      }
    }
    for (const key in newFlags) {
      if (newFlags.hasOwnProperty(key) && (!flags[key] || flags[key].deleted)) {
        changes[key] = { current: newFlags[key].value };
      }
    }

    flags = newFlags;
    postProcessSettingsUpdate(changes);
  }

  function postProcessSettingsUpdate(changes) {
    const keys = Object.keys(changes);

    if (useLocalStorage) {
      store.clear(localStorageKey);
      localStorageKey = lsKey(environment, ident.getUser());
      store.set(localStorageKey, JSON.stringify(utils.transformValuesToUnversionedValues(flags)));
    }

    if (keys.length > 0) {
      keys.forEach(key => {
        emitter.emit(changeEvent + ':' + key, changes[key].current, changes[key].previous);
      });

      emitter.emit(changeEvent, changes);

      keys.forEach(key => {
        sendFlagEvent(key, changes[key].current);
      });
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

  if (options.samplingInterval !== undefined && (isNaN(options.samplingInterval) || options.samplingInterval < 0)) {
    samplingInterval = 0;
    utils.onNextTick(() => {
      emitter.maybeReportError(
        new errors.LDInvalidArgumentError(
          'Invalid sampling interval configured. Sampling interval must be an integer >= 0.'
        )
      );
    });
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
    utils.onNextTick(() => {
      emitter.emit(readyEvent);
    });
  } else if (
    typeof options.bootstrap === 'string' &&
    options.bootstrap.toUpperCase() === 'LOCALSTORAGE' &&
    !!localStorage
  ) {
    useLocalStorage = true;

    // check if localStorage data is corrupted, if so clear it
    try {
      flags = utils.transformValuesToVersionedValues(JSON.parse(store.get(localStorageKey)));
    } catch (error) {
      store.clear(localStorageKey);
    }

    if (flags === null) {
      requestor.fetchFlagSettings(ident.getUser(), hash, (err, settings) => {
        if (err) {
          emitter.maybeReportError(new errors.LDFlagFetchError(messages.errorFetchingFlags(err)));
        }
        flags = settings;
        settings && store.set(localStorageKey, JSON.stringify(utils.transformValuesToUnversionedValues(flags)));
        emitter.emit(readyEvent);
      });
    } else {
      // We're reading the flags from local storage. Signal that we're ready,
      // then update localStorage for the next page load. We won't signal changes or update
      // the in-memory flags unless you subscribe for changes
      utils.onNextTick(() => {
        emitter.emit(readyEvent);
      });

      requestor.fetchFlagSettings(ident.getUser(), hash, (err, settings) => {
        if (err) {
          emitter.maybeReportError(new errors.LDFlagFetchError(messages.errorFetchingFlags(err)));
        }
        settings && store.set(localStorageKey, JSON.stringify(utils.transformValuesToUnversionedValues(settings)));
      });
    }
  } else {
    requestor.fetchFlagSettings(ident.getUser(), hash, (err, settings) => {
      if (err) {
        emitter.maybeReportError(new errors.LDFlagFetchError(messages.errorFetchingFlags(err)));
      }
      flags = settings;
      emitter.emit(readyEvent);
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
  });

  function start() {
    if (sendEvents) {
      setTimeout(function tick() {
        events.flush(ident.getUser());
        setTimeout(tick, flushInterval);
      }, flushInterval);
    }
  }

  if (document.readyState !== 'complete') {
    window.addEventListener('load', start);
  } else {
    start();
  }

  window.addEventListener('beforeunload', () => {
    events.flush(ident.getUser(), true);
  });

  window.addEventListener('message', handleMessage);

  const readyPromise = new Promise(resolve => {
    const onReady = emitter.on(readyEvent, () => {
      emitter.off(readyEvent, onReady);
      resolve();
    });
  });

  const client = {
    waitUntilReady: () => readyPromise,
    identify: identify,
    variation: variation,
    track: track,
    on: on,
    off: off,
    flush: flush,
    allFlags: allFlags,
  };

  return client;
}

const version = VERSION;

export default { initialize, version };
