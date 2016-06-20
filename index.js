var flags = {};
var environment;
var current;
var stream;

function fetchFlagSettings() {
  const data = encodeURIComponent(btoa(JSON.stringify(this.user)));
  const endpoint = ['http://dockerhost/sdk', '/eval/', environment,  '/users/', data].join('');
  
  var xhr = new XMLHttpRequest();
  
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      if (xhr.getResponseHeader('Content-type')) {
        var settings = JSON.parse(xhr.responseText);
        flags = settings.items;
      }
    }
  };
  
  xhr.open('GET', endpoint);
  xhr.send();
}

function handlePing(event) {
  fetchFlagSettings();
}

function identify(user) {}

function toggle(key, defaultValue) {
  if (flags.hasOwnProperty(key)) {
    return flags[key].value === null ? defaultValue : flags[key].value;
  } else {
    return defaultValue;
  }
}

var clientInterface = {
  identify: identify,
  toggle: toggle,
  variation: toggle
};

function initialize(env, u, options) {
  var bootstrap = (options || {}).flags || {};
  
  environment = env;
  user = u;
  flags = bootstrap;
  
  stream = new EventSource('http://dockerhost:7999/ping/' + environment);
  stream.addEventListener('ping', handlePing);
  
  return clientInterface;
}

module.exports = {
  initialize
};
