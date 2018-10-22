'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var common = require('ldclient-js-common');
var electronPlatform = require('./electronPlatform');

// Pass our platform object to the common code to create the Electron version of the client
function initialize(env, user) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var platform = electronPlatform();
  var clientVars = common.initialize(env, user, options, platform);

  clientVars.start();

  return clientVars.client;
}

module.exports = {
  version: common.version,
  initialize: initialize
};

exports.initialize = initialize;
//# sourceMappingURL=index.js.map
