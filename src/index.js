var EventEmitter = require('./EventEmitter');
var Stream = require('./Stream');
var Requestor = require('./Requestor');
var utils = require('./utils');

var flags = {};
var environment;
var stream;
var emitter;
var hash;
var user;
var baseUrl;
var streamUrl;

function identify(user) {}

function toggle(key, defaultValue) {
  if (flags.hasOwnProperty(key)) {
    return flags[key] === null ? defaultValue : flags[key];
  } else {
    return defaultValue;
  }
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
  
  // update store
  flags = settings;
  
  for (var key in changes) {
    emitter.emit('change:' + key, changes[key].current, changes[key].previous);
  }

  emitter.emit('change', utils.clone(flags));
}

var changeEvent = 'change';

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

var client = {
  identify: identify,
  toggle: toggle,
  variation: toggle,
  on: on,
  off: off
};

function initialize(env, u, options) {
  options = options || {};
  environment = env;
  user = u;
  flags = options.bootstrap || {};
  hash = options.hash;
  baseUrl = options.baseUrl || 'https://app.launchdarkly.com';
  streamUrl = options.streamUrl || 'https://stream.launchdarkly.com';
  stream = Stream(streamUrl, environment);
  emitter = EventEmitter();
  requestor = Requestor(baseUrl, environment);
  
  if (options.bootstrap) {
    // Emitting the event here will happen before the consumer
    // can register a listener, so defer to next tick.
    setTimeout(function() { emitter.emit('ready') }, 0);
  } else {
    requestor.fetchFlagSettings(user, hash, function(err, settings) {
      flags = settings;
      emitter.emit('ready');
    });
  }
  
  return client;
}

module.exports = {
  initialize: initialize
};
