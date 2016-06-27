var EventProcessor = require('./EventProcessor');
var EventEmitter = require('./EventEmitter');
var GoalTracker = require('./GoalTracker');
var Stream = require('./Stream');
var Requestor = require('./Requestor');
var Identity = require('./Identity');
var utils = require('./utils');

var flags = {};
var environment;
var events;
var stream;
var emitter;
var hash;
var ident;
var baseUrl;
var eventsUrl;
var streamUrl;
var goalTracker;

var readyEvent = 'ready';
var changeEvent = 'change';

var flushInterval = 2000;

function sendIdentifyEvent(user) {
  events.enqueue({
    kind: 'identify',
    key: user.key,
    user: user,
    creationDate: (new Date()).getTime()
  });
}

function sendFlagEvent(key, value, defaultValue) {
  events.enqueue({
    kind: 'feature',
    key: key,
    user: ident.getUser(),
    value: value,
    'default': defaultValue,
    creationDate: (new Date()).getTime()
  });
}

function sendGoalEvent(kind, goal) {
  const event = {
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

function identify(user) {
  ident.setUser(user);
}

function toggle(key, defaultValue) {
  var value;
  
  if (flags.hasOwnProperty(key)) {
    value = flags[key] === null ? defaultValue : flags[key];
  } else {
    value = defaultValue;
  }
  
  sendFlagEvent(key, value, defaultValue);
  
  return value;
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

function connectStream(onPing) {
  stream.connect(function() {
    requestor.fetchFlagSettings(user, hash, function(err, settings) {
      onPing(settings);
    });
  });
}

function updateSettings(settings) {
  const changes = utils.modifications(flags, settings);
  const keys = Object.keys(changes);
  
  flags = settings;

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
      connectStream(updateSettings);
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

var client = {
  identify: identify,
  toggle: toggle,
  variation: toggle,
  track: track,
  on: on,
  off: off
};

function initialize(env, user, options) {
  options = options || {};
  environment = env;
  flags = options.bootstrap || {};
  hash = options.hash;
  baseUrl = options.baseUrl || 'https://app.launchdarkly.com';
  eventsUrl = options.eventsUrl || 'https://events.launchdarkly.com';
  streamUrl = options.streamUrl || 'https://stream.launchdarkly.com';
  stream = Stream(streamUrl, environment);
  events = EventProcessor(eventsUrl + '/a/' + environment + '.gif');
  emitter = EventEmitter();
  ident = Identity(user, sendIdentifyEvent);
  requestor = Requestor(baseUrl, environment);
  
  if (options.bootstrap) {
    // Emitting the event here will happen before the consumer
    // can register a listener, so defer to next tick.
    setTimeout(function() { emitter.emit(readyEvent); }, 0);
  } else {
    requestor.fetchFlagSettings(ident.getUser(), hash, function(err, settings) {
      flags = settings;
      emitter.emit(readyEvent);
    });
  }
  
  requestor.fetchGoals(function(err, goals) {
    if (err) {/* TODO */}
    if (goals.length > 0) {
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
  
  window.addEventListener('beforeunload', function() {
    events.flush(ident.getUser(), true);
  });
  
  window.addEventListener('message', handleMessage);
  
  return client;
}

module.exports = {
  initialize: initialize
};
