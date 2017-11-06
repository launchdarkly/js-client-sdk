var EventProcessor = require('./EventProcessor');
var EventEmitter = require('./EventEmitter');
var GoalTracker = require('./GoalTracker');
var Stream = require('./Stream');
var Requestor = require('./Requestor');
var Identity = require('./Identity');
var utils = require('./utils');
var messages = require('./messages');

function initialize(env, user, options) {
  options = options || {};

  var readyEvent = 'ready';
  var changeEvent = 'change';

  var client = {
    identify: identify,
    variation: variation,
    track: track,
    on: on,
    off: off,
    allFlags: allFlags
  };

  var environment = env;
  var flags = typeof(options.bootstrap) === 'object' ? options.bootstrap : {};
  var hash = options.hash;
  var baseUrl = options.baseUrl || 'https://app.launchdarkly.com';
  var eventsUrl = options.eventsUrl || 'https://events.launchdarkly.com';
  var streamUrl = options.streamUrl || 'https://clientstream.launchdarkly.com';
  var stream = Stream(streamUrl, environment);
  var events = EventProcessor(eventsUrl + '/a/' + environment + '.gif');
  var emitter = EventEmitter();
  var ident = Identity(user, sendIdentifyEvent);
  var requestor = Requestor(baseUrl, environment);
  var localStorageKey = lsKey(environment, ident.getUser());

  var goalTracker;
  var useLocalStorage;
  var goals;

  var flushInterval = 2000;
  var seenRequests = {};
  
  if (typeof options.bootstrap === 'object') {
    // Emitting the event here will happen before the consumer
    // can register a listener, so defer to next tick.
    setTimeout(function() { emitter.emit(readyEvent); }, 0);
  }
  else if (typeof(options.bootstrap) === 'string' && options.bootstrap.toUpperCase() === 'LOCALSTORAGE' && typeof(Storage) !== 'undefined') {
    useLocalStorage = true;
    // check if localstorage data is corrupted, if so clear it
    try {
      flags = JSON.parse(localStorage.getItem(localStorageKey));
    } catch (error) {
      localStorage.setItem(localStorageKey, null);
    }

    if (flags === null) {
      requestor.fetchFlagSettings(ident.getUser(), hash, function(err, settings) {
        if (err) {
          console.warn('Error fetching flag settings: ', err);
        }        
        flags = settings;
        settings && localStorage.setItem(localStorageKey, JSON.stringify(flags));
        emitter.emit(readyEvent);
      });
    } else {
      // We're reading the flags from local storage. Signal that we're ready,
      // then update localStorage for the next page load. We won't signal changes or update
      // the in-memory flags unless you subscribe for changes
      setTimeout(function() { emitter.emit(readyEvent); }, 0);
      requestor.fetchFlagSettings(ident.getUser(), hash, function(err, settings) {
        if (err) {
          console.warn('Error fetching flag settings: ', err);
        }
        settings && localStorage.setItem(localStorageKey, JSON.stringify(settings));
      });
    }
  }
  else {
    requestor.fetchFlagSettings(ident.getUser(), hash, function(err, settings) {
      if (err) {
        console.warn('Error fetching flag settings: ', err);
      }
      
      flags = settings;
      emitter.emit(readyEvent);
    });
  }

  requestor.fetchGoals(function(err, g) {
    if (err) { 
      console.warn('Error fetching goals: ', err);
    }
    if (g && g.length > 0) {
      goals = g;
      goalTracker = GoalTracker(goals, sendGoalEvent);
    }
  });

  if (document.readyState !== 'complete') {
    window.addEventListener('load', start);
  } else {
    start();
  }

  window.addEventListener('beforeunload', function() {
    events.flush(ident.getUser(), true);
  });

  if (goals && goals.length > 0) {
    if (!!(window.history && history.pushState)) {
      window.addEventListener('popstate', refreshGoalTracker);
    } else {
      window.addEventListener('hashchange', refreshGoalTracker);
    }
  }

  window.addEventListener('message', handleMessage);

  return client;

  function start() {
    setTimeout(function tick() {
      events.flush(ident.getUser());
      setTimeout(tick, flushInterval);
    }, flushInterval);
  }

  function refreshGoalTracker() {
    if (goalTracker) {
      goalTracker.dispose();
    }
    if (goals && goals.length) {
      goalTracker = GoalTracker(goals, sendGoalEvent);
    }
  }

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
    requestor.fetchFlagSettings(ident.getUser(), hash, function(err, settings) {
      if (err) {
        console.warn('Error fetching flag settings: ', err);
      }
      if (settings) {
        updateSettings(settings);
      }
      onDone && onDone();
    });
  }

  function variation(key, defaultValue) {
    var value;

    if (flags && flags.hasOwnProperty(key)) {
      value = flags[key] === null ? defaultValue : flags[key];
    } else {
      value = defaultValue;
    }

    sendFlagEvent(key, value, defaultValue);

    return value;
  }

  function allFlags() {
    var results = {};

    if (!flags) { return results; }

    for (var key in flags) {
      if (flags.hasOwnProperty(key)) {
        results[key] = variation(key, null);
      }
    }

    return results;
  }

  function customEventExists(key) {
    if (!goals || goals.length === 0) { return false; }

    for (var i=0 ; i < goals.length ; i++) {
      if (goals[i].kind === 'custom' && goals[i].key === key) {
        return true;
      }
    }

    return false;
  }

  function track(key, data) {
    if (typeof key !== 'string') {
      throw messages.invalidKey();
    }

    // Validate key if we have goals
    if (!!goals && !customEventExists(key)) {
      console.warn(messages.unknownCustomEventKey(key));
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
    stream.connect(function() {
      requestor.fetchFlagSettings(ident.getUser(), hash, function(err, settings) {
        if (err) {
          console.warn('Error fetching flag settings: ', err);
        }      
        updateSettings(settings);
      });
    });
  }

  function updateSettings(settings) {
    var changes;
    var keys;

    if (!settings) { return; }

    changes = utils.modifications(flags, settings);
    keys = Object.keys(changes);

    flags = settings;

    if (useLocalStorage) {
      localStorage.setItem(lsKey(environment, ident.getUser()), JSON.stringify(flags));
    }

    if (keys.length > 0) {
      keys.forEach(function(key) {
        emitter.emit(changeEvent + ':' + key, changes[key].current, changes[key].previous);
      });

      emitter.emit(changeEvent, changes);

      keys.forEach(function(key) {
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
    if (event.origin !== baseUrl) { return; }
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

  function lsKey(env, user) {
    var uKey = '';
    if (user && user.key) {
      uKey = user.key;
    }
    return 'ld:' + env + ':' + uKey;
  }
}

module.exports = {
  initialize: initialize
};

if(typeof VERSION !== 'undefined') {
  module.exports.version = VERSION;
}
