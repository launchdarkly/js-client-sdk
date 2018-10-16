import * as common from 'ldclient-js-common';

export function initialize(env, user, options = {}) {
  return common.initialize(env, user, options);
}

export const version = common.version;

function deprecatedInitialize(env, user, options = {}) {
  console && console.warn && console.warn(common.messages.deprecated('default export', 'named LDClient export'));
  return initialize(env, user, options);
}

export default { initialize: deprecatedInitialize, version };
