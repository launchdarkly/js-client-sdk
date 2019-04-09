import * as utils from './utils';
import * as errors from './errors';
import * as messages from './messages';
import promiseCoalescer from './promiseCoalescer';

const json = 'application/json';

function getResponseError(result) {
  if (result.status === 404) {
    return new errors.LDInvalidEnvironmentIdError(messages.environmentNotFound());
  } else {
    return new errors.LDFlagFetchError(messages.errorFetchingFlags(result.statusText || String(result.status)));
  }
}

export default function Requestor(platform, options, environment, logger) {
  const baseUrl = options.baseUrl;
  const useReport = options.useReport;
  const withReasons = options.evaluationReasons;
  const sendLDHeaders = options.sendLDHeaders;

  const requestor = {};

  const activeRequests = {}; // map of URLs to promiseCoalescers

  function fetchJSON(endpoint, body) {
    if (!platform.httpRequest) {
      return new Promise((resolve, reject) => {
        reject(new errors.LDFlagFetchError(messages.httpUnavailable()));
      });
    }

    const method = body ? 'REPORT' : 'GET';
    const headers = sendLDHeaders ? utils.getLDHeaders(platform) : {};
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    let coalescer = activeRequests[endpoint];
    if (!coalescer) {
      coalescer = promiseCoalescer(() => {
        // this will be called once there are no more active requests for the same endpoint
        delete activeRequests[endpoint];
      });
      activeRequests[endpoint] = coalescer;
    }

    const req = platform.httpRequest(method, endpoint, headers, body);
    const p = req.promise.then(
      result => {
        if (
          result.status === 200 &&
          result.headers['content-type'] &&
          result.headers['content-type'].lastIndexOf(json) === 0
        ) {
          return JSON.parse(result.body);
        } else {
          return Promise.reject(getResponseError(result));
        }
      },
      () => Promise.reject(new errors.LDFlagFetchError(messages.networkError()))
    );
    coalescer.addPromise(p, () => {
      // this will be called if another request for the same endpoint supersedes this one
      req.cancel && req.cancel();
    });
    return coalescer.resultPromise;
  }

  // Returns a Promise which will resolve with the parsed JSON response, or will be
  // rejected if the request failed.
  requestor.fetchFlagSettings = function(user, hash) {
    let data;
    let endpoint;
    let query = '';
    let body;

    if (useReport) {
      endpoint = [baseUrl, '/sdk/evalx/', environment, '/user'].join('');
      body = JSON.stringify(user);
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

    return fetchJSON(endpoint, body);
  };

  // Returns a Promise which will resolve with the parsed JSON response, or will be
  // rejected if the request failed.
  requestor.fetchGoals = function() {
    const endpoint = [baseUrl, '/sdk/goals/', environment].join('');
    return fetchJSON(endpoint, null);
  };

  return requestor;
}
