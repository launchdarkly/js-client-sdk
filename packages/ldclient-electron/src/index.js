import * as browserClient from 'ldclient-js';
import * as common from 'ldclient-js-common';
import * as winston from 'winston';
import electronPlatform from './electronPlatform';
import * as interprocessSync from './interprocessSync';
import * as nodeSdkEmulation from './nodeSdkEmulation';

// This creates an SDK instance to be used in the main process of Electron. It can be used
// either by itself or in combination with SDK instances in renderer windows (created with
// initializeRenderer).
export function initializeInMain(env, user, options = {}) {
  // Pass our platform object to the common code to create the Electron version of the client
  const platform = electronPlatform(options);
  const extraDefaults = {};
  if (!options.logger) {
    extraDefaults.logger = createDefaultLogger();
  }
  const clientVars = common.initialize(env, user, options, platform, extraDefaults);
  const client = clientVars.client;

  // This tracker object communicates with any client instances in the renderer process that
  // were created with initializeInRenderer(), to keep them in sync with our state. If there
  // are no such clients, it has no effect.
  const tracker = interprocessSync.createMainProcessClientStateTracker(env, user, clientVars.logger);
  client.on('ready', () => tracker.initialized(clientVars.getFlagsInternal()));
  client.on(clientVars.internalChangeEventName, tracker.updatedFlags);
  tracker.on('event', event => clientVars.enqueueEvent(event));

  const realIdentify = client.identify;
  client.identify = (user, hash, cb) => {
    tracker.changedUser(user);
    return realIdentify(user, hash, cb);
  };

  client.close = () => clientVars.stop();

  // This method is probably not of much use in Electron since we have a better way to send flag
  // data to the front end, but it exists in all the server-side SDKs so why not.
  client.allFlagsState = () => {
    const flags = clientVars.getFlagsInternal();
    const result = {};
    const metadata = {};
    Object.keys(flags).forEach(key => {
      const flagState = Object.assign({}, flags[key]);
      result[key] = flagState.value;
      delete flagState.value;
      metadata[key] = flagState;
    });
    result['$flagsState'] = metadata;
    result['$valid'] = true;
    return result;
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

export const createNodeSdkAdapter = nodeSdkEmulation.createNodeSdkAdapter;

export const createConsoleLogger = common.createConsoleLogger;

export const version = common.version;

// This is called remotely by stateProvider.getInitialState()
export function getInternalClientState(optionalEnv) {
  const t = interprocessSync.getMainProcessClientStateTracker(optionalEnv);
  return t ? t.getInitedState() : null;
}

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
