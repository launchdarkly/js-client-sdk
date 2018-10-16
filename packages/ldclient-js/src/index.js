import * as common from 'ldclient-js-common';
import browserPlatform from './browserPlatform';

// Pass our platform object to the common code to create the browser version of the client
export function initialize(env, user, options = {}) {
  const clientVars = common.initialize(env, user, options, browserPlatform());

  const client = clientVars.client;
  const validatedOptions = clientVars.options;

  // The following event listener is used for handshaking with the LaunchDarkly application UI when
  // the user's page is being loaded within a frame, for setting up a click event.
  window.addEventListener('message', handleMessage);
  function handleMessage(event) {
    if (event.origin !== validatedOptions.baseUrl) {
      return;
    }
    if (event.data.type === 'SYN') {
      window.editorClientBaseUrl = validatedOptions.baseUrl;
      const editorTag = document.createElement('script');
      editorTag.type = 'text/javascript';
      editorTag.async = true;
      editorTag.src = validatedOptions.baseUrl + event.data.editorClientUrl;
      const s = document.getElementsByTagName('script')[0];
      s.parentNode.insertBefore(editorTag, s);
    }
  }

  if (document.readyState !== 'complete') {
    window.addEventListener('load', clientVars.start);
  } else {
    clientVars.start();
  }

  window.addEventListener('beforeunload', clientVars.stop);

  return client;
}

export const version = common.version;

function deprecatedInitialize(env, user, options = {}) {
  console && console.warn && console.warn(common.messages.deprecated('default export', 'named LDClient export'));
  return initialize(env, user, options);
}

export default { initialize: deprecatedInitialize, version };
