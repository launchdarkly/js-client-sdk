import * as utils from './utils';
import * as errors from './errors';
import * as messages from './messages';

const json = 'application/json';

function getResponseError(xhr) {
  if (xhr.status === 404) {
    return new errors.LDInvalidEnvironmentIdError(messages.environmentNotFound());
  } else {
    return xhr.statusText;
  }
}

export default function Requestor(platform, options, environment, logger) {
  const baseUrl = options.baseUrl;
  const useReport = options.useReport;
  const withReasons = options.evaluationReasons;
  const sendLDHeaders = options.sendLDHeaders;
  let flagSettingsRequest;
  let lastFlagSettingsCallback;

  const requestor = {};

  function fetchJSON(endpoint, body, callback) {
    if (!platform.newHttpRequest) {
      utils.onNextTick(() => {
        callback(new errors.LDFlagFetchError(messages.httpUnavailable()));
      });
      return;
    }

    const xhr = platform.newHttpRequest();
    let data = undefined;

    xhr.addEventListener('load', () => {
      if (
        xhr.status === 200 &&
        xhr.getResponseHeader('Content-type') &&
        xhr.getResponseHeader('Content-Type').lastIndexOf(json) === 0
      ) {
        callback(null, JSON.parse(xhr.responseText));
      } else {
        callback(getResponseError(xhr));
      }
    });

    xhr.addEventListener('error', () => {
      callback(getResponseError(xhr));
    });

    if (body) {
      xhr.open('REPORT', endpoint);
      xhr.setRequestHeader('Content-Type', 'application/json');
      data = JSON.stringify(body);
    } else {
      xhr.open('GET', endpoint);
    }

    if (sendLDHeaders) {
      utils.addLDHeaders(xhr, platform);
    }

    xhr.send(data);

    return xhr;
  }

  requestor.fetchFlagSettings = function(user, hash, callback) {
    let data;
    let endpoint;
    let query = '';
    let body;
    let cb;

    if (useReport) {
      endpoint = [baseUrl, '/sdk/evalx/', environment, '/user'].join('');
      body = user;
    } else {
      data = utils.base64URLEncode(JSON.stringify(user));
      endpoint = [baseUrl, '/sdk/evalx/', environment, '/users/', data].join('');
    }
    if (hash) {
      query = 'h=' + hash;
    }
    if (withReasons) {
      query = query + (query ? '&' : '') + 'withReasons=true';
    }
    endpoint = endpoint + (query ? '?' : '') + query;
    logger.debug(messages.debugPolling(endpoint));

    const wrappedCallback = (function(currentCallback) {
      return function(error, result) {
        currentCallback(error, result);
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
