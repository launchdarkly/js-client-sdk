var EventProcessor = require('./EventProcessor');
var EventEmitter = require('./EventEmitter');
var GoalTracker = require('./GoalTracker');
var Stream = require('./Stream');
var Requestor = require('./Requestor');
var Identity = require('./Identity');
var utils = require('./utils');
var dashify = require('dashify');

var flags = {};
var environment;
var events;
var requestor;
var stream;
var emitter;
var hash;
var ident;
var baseUrl;
var eventsUrl;
var streamUrl;
var goalTracker;
var useLocalStorage;
var goals;

var readyEvent = 'ready';
var changeEvent = 'change';

var flushInterval = 2000;

var seenRequests = {};

function sendIdentifyEvent(user) {
  events.enqueue({
    kind: 'identify',
    key: user.key,
    user: user,
    creationDate: (new Date()).getTime()
  });
}

function sendFlagEvent(key, value, defaultValue) {
  var user = ident.getUser();
  var cacheKey = JSON.stringify(value) + (user && user.key ? user.key : '') + key;
  var now = new Date();
  var cached = seenRequests[cacheKey];

  if (cached && (now - cached) < 300000 /* five minutes, in ms */) {
    return;
  }

  seenRequests[cacheKey] = now;

  events.enqueue({
    kind: 'feature',
    key: key,
    user: user,
    value: value,
    'default': defaultValue,
    creationDate: now.getTime()
  });
}

function sendGoalEvent(kind, goal) {
  var event = {
    kind: kind,
    key: goal.key,
    data: null,
    url: window.location.href,
    creationDate: (new Date()).getTime()
  };

  if (kind === 'click') {
    event.selector = goal.selector;
  }

  return events.enqueue(event);
}

function identify(user, hash, onDone) {
  ident.setUser(user);
  requestor.fetchFlagSettings(ident.getUser(), hash, function (err, settings) {
    if (settings) {
      updateSettings(settings);
    }
    onDone();
  });
}

function removeDashes(s) {
  return s.replace(/-/g, '');
}

/**
 * Retrieve a flag value for a given key from in-memory cache populated by initialize method.
 * @param key Retrieve value for this key. Can be of two formats: all-low-caps-dash-separated or camelCased
 * @param defaultValue Use this value if flag does not exist in memory
 * @returns {*} The value of the flag specified by key
 */
function variation(key, defaultValue) {
  // transform keys into all lower case without dashes
  var strippedLoweredKey = key.toLowerCase();
  if(key.includes('-')) {
    strippedLoweredKey = removeDashes(strippedLoweredKey);
  }

  // the keys in memory from the server are already in lower case,
  // so we just need to strip dashes
  for(const dashedKey in flags) {
    if(removeDashes(dashedKey) === strippedLoweredKey) {
      var value = flags[dashedKey] ? flags[dashedKey] : defaultValue;
      sendFlagEvent(dashedKey, value, defaultValue);
      return value;
    }
  }

  // key not found
  sendFlagEvent(key, defaultValue, defaultValue);
  return defaultValue;
}

function allFlags() {
  var results = {};
  for (var key in flags) {
    if (flags.hasOwnProperty(key)) {
      results[key] = variation(key, null);
    }
  }

  return results;
}

function track(key, data) {
  if (typeof key !== 'string') {
    throw 'Event key must be a string';
  }

  events.enqueue({
    kind: 'custom',
    key: key,
    data: data,
    url: window.location.href,
    creationDate: (new Date()).getTime()
  });
}

function connectStream() {
  stream.connect(function () {
    requestor.fetchFlagSettings(ident.getUser(), hash, function (err, settings) {
      updateSettings(settings);
    });
  });
}

function updateSettings(settings) {
  var changes = utils.modifications(flags, settings);
  var keys = Object.keys(changes);

  flags = settings;

  if (useLocalStorage) {
    localStorage.setItem(lsKey(environment, ident.getUser()), JSON.stringify(flags));
  }

  if (keys.length > 0) {
    keys.forEach(function (key) {
      emitter.emit(changeEvent + ':' + key, changes[key].current, changes[key].previous);
    });

    emitter.emit(changeEvent, changes);

    keys.forEach(function (key) {
      sendFlagEvent(key, changes[key].current);
    });
  }
}

function on(event, handler, context) {
  if (event.substr(0, changeEvent.length) === changeEvent) {
    if (!stream.isConnected()) {
      connectStream();
    }
    emitter.on.apply(emitter, [event, handler, context]);
  } else {
    emitter.on.apply(emitter, Array.prototype.slice.call(arguments));
  }
}

function off() {
  emitter.off.apply(emitter, Array.prototype.slice.call(arguments));
}

function handleMessage(event) {
  if (event.origin !== baseUrl) {
    return;
  }
  if (event.data.type === 'SYN') {
    window.editorClientBaseUrl = baseUrl;
    var editorTag = document.createElement('script');
    editorTag.type = 'text/javascript';
    editorTag.async = true;
    editorTag.src = baseUrl + event.data.editorClientUrl;
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(editorTag, s);
  }
}

var client = {
  identify: identify,
  variation: variation,
  track: track,
  on: on,
  off: off,
  allFlags: allFlags
};

function lsKey(env, user) {
  var uKey = '';
  if (user && user.key) {
    uKey = user.key;
  }
  return 'ld:' + env + ':' + uKey;
}

function initialize(env, user, options) {
  options = options || {};
  environment = env;
  flags = typeof(options.bootstrap) === 'object' ? options.bootstrap : {};
  hash = options.hash;
  baseUrl = options.baseUrl || 'https://app.launchdarkly.com';
  eventsUrl = options.eventsUrl || 'https://events.launchdarkly.com';
  streamUrl = options.streamUrl || 'https://stream.launchdarkly.com';
  stream = Stream(streamUrl, environment);
  events = EventProcessor(eventsUrl + '/a/' + environment + '.gif');
  emitter = EventEmitter();
  ident = Identity(user, sendIdentifyEvent);
  requestor = Requestor(baseUrl, environment);

  if (typeof options.bootstrap === 'object') {
    // Emitting the event here will happen before the consumer
    // can register a listener, so defer to next tick.
    setTimeout(function () {
      emitter.emit(readyEvent);
    }, 0);
  }
  else if (typeof(options.bootstrap) === 'string' && options.bootstrap.toUpperCase() === 'LOCALSTORAGE' && typeof(Storage) !== 'undefined') {
    useLocalStorage = true;
    flags = JSON.parse(localStorage.getItem(lsKey(environment, ident.getUser())));

    if (flags === null) {
      requestor.fetchFlagSettings(ident.getUser(), hash, function (err, settings) {
        flags = settings;
        localStorage.setItem(lsKey(environment, ident.getUser()), JSON.stringify(flags));
        emitter.emit(readyEvent);
      });
    } else {
      // We're reading the flags from local storage. Signal that we're ready,
      // then update localStorage for the next page load. We won't signal changes or update
      // the in-memory flags unless you subscribe for changes
      setTimeout(function () {
        emitter.emit(readyEvent);
      }, 0);
      requestor.fetchFlagSettings(ident.getUser(), hash, function (err, settings) {
        localStorage.setItem(lsKey(environment, ident.getUser()), JSON.stringify(settings));
      });
    }
  }
  else {
    requestor.fetchFlagSettings(ident.getUser(), hash, function (err, settings) {
      flags = settings;
      emitter.emit(readyEvent);
    });
  }

  requestor.fetchGoals(function (err, g) {
    if (err) {/* TODO */
    }
    if (g && g.length > 0) {
      goals = g;
      goalTracker = GoalTracker(goals, sendGoalEvent);
    }
  });

  function start() {
    setTimeout(function tick() {
      events.flush(ident.getUser());
      setTimeout(tick, flushInterval);
    }, flushInterval);
  }

  if (document.readyState !== 'complete') {
    window.addEventListener('load', start);
  } else {
    start();
  }

  window.addEventListener('beforeunload', function () {
    events.flush(ident.getUser(), true);
  });

  function refreshGoalTracker() {
    if (goalTracker) {
      goalTracker.dispose();
    }
    if (goals && goals.length) {
      goalTracker = GoalTracker(goals, sendGoalEvent);
    }
  }

  if (goals && goals.length > 0) {
    if (!!(window.history && history.pushState)) {
      window.addEventListener('popstate', refreshGoalTracker);
    } else {
      window.addEventListener('hashchange', refreshGoalTracker);
    }
  }

  window.addEventListener('message', handleMessage);

  return client;
}

module.exports = {
  initialize: initialize
};

if (typeof VERSION !== 'undefined') {
  module.exports.version = VERSION;
}