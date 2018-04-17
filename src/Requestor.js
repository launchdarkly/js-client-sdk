import * as utils from './utils';
import * as errors from './errors';
import * as messages from './messages';

const json = 'application/json';

function fetchJSON(endpoint, body, callback) {
  const xhr = new XMLHttpRequest();

  xhr.addEventListener('load', () => {
    if (xhr.status === 200 && xhr.getResponseHeader('Content-type') === json) {
      callback(null, JSON.parse(xhr.responseText));
    } else {
      callback(xhr.statusText);
    }
  });

  xhr.addEventListener('error', () => {
    if (xhr.status === 404) {
      callback(new errors.LDInvalidEnvironmentIdError(messages.environmentNotFound()));
    }
    callback(xhr.statusText);
  });

  if (body) {
    xhr.open('REPORT', endpoint);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(body));
  } else {
    xhr.open('GET', endpoint);
    xhr.send();
  }

  return xhr;
}

export default function Requestor(baseUrl, environment, useReport) {
  let flagSettingsRequest;
  let lastFlagSettingsCallback;

  const requestor = {};

  requestor.fetchFlagSettings = function(user, hash, callback) {
    let data;
    let endpoint;
    let body;
    let cb;

    if (useReport) {
      endpoint = [baseUrl, '/sdk/eval/', environment, '/user', hash ? '?h=' + hash : ''].join('');
      body = user;
    } else {
      data = utils.base64URLEncode(JSON.stringify(user));
      endpoint = [baseUrl, '/sdk/eval/', environment, '/users/', data, hash ? '?h=' + hash : ''].join('');
    }

    const wrappedCallback = (function(currentCallback) {
      return function(error, result) {
        let finalResult = result;
        // if we got flags, convert them to the more verbose format used by the eval stream
        if (result) {
          finalResult = utils.transformValuesToVersionedValues(result);
        }
        currentCallback(error, finalResult);
        flagSettingsRequest = null;
        lastFlagSettingsCallback = null;
      };
    })(callback);

    if (flagSettingsRequest) {
      flagSettingsRequest.abort();
      cb = (function(prevCallback) {
        return function() {
          prevCallback && prevCallback.apply(null, arguments);
          wrappedCallback.apply(null, arguments);
        };
      })(lastFlagSettingsCallback);
    } else {
      cb = wrappedCallback;
    }

    lastFlagSettingsCallback = cb;
    flagSettingsRequest = fetchJSON(endpoint, body, cb);
  };

  requestor.fetchGoals = function(callback) {
    const endpoint = [baseUrl, '/sdk/goals/', environment].join('');
    fetchJSON(endpoint, null, callback);
  };

  return requestor;
}
