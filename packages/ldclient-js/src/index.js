import * as common from 'ldclient-js-common';
import browserPlatform from './browserPlatform';

// Pass our platform object to the common code to create the browser version of the client
export function initialize(env, user, options = {}) {
  return common.initialize(env, user, options, browserPlatform());
}

export const version = common.version;

function deprecatedInitialize(env, user, options = {}) {
  console && console.warn && console.warn(common.messages.deprecated('default export', 'named LDClient export'));
  return initialize(env, user, options);
}

export default { initialize: deprecatedInitialize, version };
