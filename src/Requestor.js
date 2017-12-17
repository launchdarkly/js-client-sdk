import * as utils from './utils';

var json = 'application/json';

function fetchJSON(endpoint, callback) {
   var xhr = new XMLHttpRequest();

   xhr.addEventListener('load', function() {
      if (
         xhr.status === 200 &&
         xhr.getResponseHeader('Content-type') === json
      ) {
         callback(null, JSON.parse(xhr.responseText));
      } else {
         callback(xhr.statusText);
      }
   });

   xhr.addEventListener('error', function() {
      callback(xhr.statusText);
   });

   xhr.open('GET', endpoint);
   xhr.send();

   return xhr;
}

var flagSettingsRequest;
var lastFlagSettingsCallback;

export default function Requestor(baseUrl, environment) {
   var requestor = {};

   requestor.fetchFlagSettings = function(user, hash, callback) {
      var data = utils.base64URLEncode(JSON.stringify(user));
      var endpoint = [
         baseUrl,
         '/sdk/eval/',
         environment,
         '/users/',
         data,
         hash ? '?h=' + hash : '',
      ].join('');
      var cb;

      var wrappedCallback = (function(currentCallback) {
         return function() {
            currentCallback.apply(null, arguments);
            flagSettingsRequest = null;
            lastFlagSettingsCallback = null;
         };
      })(callback);

      if (flagSettingsRequest) {
         flagSettingsRequest.abort();
         cb = (function(prevCallback) {
            return function() {
               if (prevCallback) prevCallback.apply(null, arguments);
               wrappedCallback.apply(null, arguments);
            };
         })(lastFlagSettingsCallback);
      } else {
         cb = wrappedCallback;
      }

      lastFlagSettingsCallback = cb;
      flagSettingsRequest = fetchJSON(endpoint, cb);
   };

   requestor.fetchGoals = function(callback) {
      var endpoint = [baseUrl, '/sdk/goals/', environment].join('');
      fetchJSON(endpoint, callback);
   };

   return requestor;
}
