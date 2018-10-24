import * as common from 'ldclient-js-common';
import electronPlatform from './electronPlatform';

// Pass our platform object to the common code to create the Electron version of the client
export function initialize(env, user, options = {}) {
  const platform = electronPlatform();
  const clientVars = common.initialize(env, user, options, platform);

  clientVars.start();

  return clientVars.client;
}

export const version = common.version;
