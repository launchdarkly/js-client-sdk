const common = require('ldclient-js-common');
const electronPlatform = require('./electronPlatform');

// Pass our platform object to the common code to create the Electron version of the client
export function initialize(env, user, options = {}) {
  const platform = electronPlatform();
  const clientVars = common.initialize(env, user, options, platform);

  clientVars.start();

  return clientVars.client;
}

module.exports = {
  version: common.version,
  initialize: initialize,
};
