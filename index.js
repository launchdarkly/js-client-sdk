var flags = {};
var environment;
var stream;
var hash;
var user;
var baseUrl;
var streamUrl;

function fetchFlagSettings() {
  const data = encodeURIComponent(base64url(JSON.stringify(user)));
  const endpoint = [baseUrl, '/sdk/eval/', environment,  '/users/', data, hash ? "?h=" + encodeURIComponent(hash) : ""].join('');

  var xhr = new XMLHttpRequest();
  
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      if (xhr.getResponseHeader('Content-type')) {
        flags = JSON.parse(xhr.responseText);
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
    return flags[key] === null ? defaultValue : flags[key];
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
  options = options || {};  
  environment = env;
  user = u;
  flags = options.bootstrap || {};
  hash = options.hash;
  baseUrl = options.baseUrl || `https://app.launchdarkly.com`;
  streamUrl = options.streamUrl || `https://stream.launchdarkly.com`;

  stream = new EventSource(streamUrl + '/ping/' + environment);
  stream.addEventListener('ping', handlePing);
  
  return clientInterface;
}

module.exports = {
  initialize
};

function fromBase64(base64string) {
  return (
    base64string
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  );
}

function base64url(stringOrBuffer, encoding) {
  return fromBase64(Buffer(stringOrBuffer, encoding).toString('base64'));
}
