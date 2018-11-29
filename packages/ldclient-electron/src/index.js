import * as browserClient from 'ldclient-js';
import * as common from 'ldclient-js-common';
import * as winston from 'winston';
import electronPlatform from './electronPlatform';
import * as interprocessSync from './interprocessSync';

// This creates an SDK instance to be used in the main process of Electron. It can be used
// either by itself or in combination with SDK instances in renderer windows (created with
// initializeRenderer).
export function initializeMain(env, user, options = {}) {
  // Pass our platform object to the common code to create the Electron version of the client
  const platform = electronPlatform();
  const extraDefaults = {};
  if (!options.logger) {
    extraDefaults.logger = createDefaultLogger();
  }
  const clientVars = common.initialize(env, user, options, platform, extraDefaults);
  const client = clientVars.client;

  // This tracker object communicates with any client instances in the renderer process that
  // were created with initializeInRenderer(), to keep them in sync with our state. If there
  // are no such clients, it has no effect.
  const tracker = interprocessSync.createMainProcessClientStateTracker(env, user);
  client.on('ready', () => tracker.initialized(clientVars.getFlagsInternal()));
  client.on(clientVars.internalChangeEventName, tracker.updatedFlags);

  const realIdentify = client.identify;
  client.identify = (user, cb) => {
    tracker.changedUser(user);
    realIdentify(user, cb);
  };

  clientVars.start();

  return clientVars.client;
}

export function initializeInRenderer(optionalEnv, options = {}) {
  let env;
  let config;
  if (optionalEnv === Object(optionalEnv)) {
    config = optionalEnv;
  } else {
    env = optionalEnv;
    config = options;
  }
  config = Object.assign({}, config, {
    stateProvider: interprocessSync.createStateProviderForRendererClient(optionalEnv),
    streaming: false, // don't want the renderer client to open a stream if someone subscribes to change events
  });
  return browserClient.initialize(env, null, config);
}

// This is called remotely by stateProvider.getInitialState()
export function getInternalClientState(optionalEnv) {
  const t = interprocessSync.getMainProcessClientStateTracker(optionalEnv);
  return t && t.state;
}

export const ConsoleLogger = common.ConsoleLogger;

export const version = common.version;

function createDefaultLogger() {
  return new winston.Logger({
    level: 'warn',
    transports: [
      new winston.transports.Console({
        formatter: options => '[LaunchDarkly] ' + (options.message || ''),
      }),
    ],
  });
}
