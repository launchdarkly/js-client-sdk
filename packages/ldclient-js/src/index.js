import * as common from 'ldclient-js-common';
import browserPlatform from './browserPlatform';
import GoalManager from './GoalManager';

const goalsEvent = 'goalsReady';
const extraDefaults = {
  fetchGoals: true,
};

// Pass our platform object to the common code to create the browser version of the client
export function initialize(env, user, options = {}) {
  const platform = browserPlatform();
  const clientVars = common.initialize(env, user, options, platform, extraDefaults);

  const client = clientVars.client;
  const validatedOptions = clientVars.options;
  const emitter = clientVars.emitter;

  const goalsPromise = new Promise(resolve => {
    const onGoals = emitter.on(goalsEvent, () => {
      emitter.off(goalsEvent, onGoals);
      resolve();
    });
  });
  client.waitUntilGoalsReady = () => goalsPromise;

  if (validatedOptions.fetchGoals) {
    const goalManager = GoalManager(clientVars, () => emitter.emit(goalsEvent));
    platform.customEventFilter = goalManager.goalKeyExists;
  } else {
    emitter.emit(goalsEvent);
  }

  if (document.readyState !== 'complete') {
    window.addEventListener('load', clientVars.start);
  } else {
    clientVars.start();
  }
  window.addEventListener('beforeunload', clientVars.stop);

  enableClickEventUIHandshake(validatedOptions.baseUrl);

  return client;
}

function enableClickEventUIHandshake(baseUrl) {
  // The following event listener is used for handshaking with the LaunchDarkly application UI when
  // the user's page is being loaded within a frame, for setting up a click event.
  window.addEventListener('message', handleMessage);
  function handleMessage(event) {
    if (event.origin !== baseUrl) {
      return;
    }
    if (event.data.type === 'SYN') {
      window.editorClientBaseUrl = baseUrl;
      const editorTag = document.createElement('script');
      editorTag.type = 'text/javascript';
      editorTag.async = true;
      editorTag.src = baseUrl + event.data.editorClientUrl;
      const s = document.getElementsByTagName('script')[0];
      s.parentNode.insertBefore(editorTag, s);
    }
  }
}

export const createConsoleLogger = common.createConsoleLogger;

export const version = common.version;

function deprecatedInitialize(env, user, options = {}) {
  console && console.warn && console.warn(common.messages.deprecated('default export', 'named LDClient export'));
  return initialize(env, user, options);
}

export default { initialize: deprecatedInitialize, version };
