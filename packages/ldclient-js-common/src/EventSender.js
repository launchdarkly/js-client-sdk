import * as errors from './errors';
import * as utils from './utils';

const MAX_URL_LENGTH = 2000;

export default function EventSender(platform, eventsUrl, environmentId, imageCreator) {
  const postUrl = eventsUrl + '/events/bulk/' + environmentId;
  const imageUrl = eventsUrl + '/a/' + environmentId + '.gif';
  const sender = {};

  function loadUrlUsingImage(src) {
    const img = new window.Image();
    img.src = src;
  }

  function getResponseInfo(result) {
    const ret = { status: result.status };
    const dateStr = result.headers['date'];
    if (dateStr) {
      const time = Date.parse(dateStr);
      if (time) {
        ret.serverTime = time;
      }
    }
    return ret;
  }

  function sendChunk(events, usePost, sync) {
    const createImage = imageCreator || loadUrlUsingImage;
    const jsonBody = JSON.stringify(events);

    function doPostRequest(canRetry) {
      const headers = utils.extend(
        {
          'Content-Type': 'application/json',
          'X-LaunchDarkly-Event-Schema': '3',
        },
        utils.getLDHeaders(platform)
      );
      return platform
        .httpRequest('POST', postUrl, headers, jsonBody, !!sync)
        .promise.then(result => {
          if (result.status >= 400 && errors.isHttpErrorRecoverable(result.status) && canRetry) {
            return doPostRequest(false);
          } else {
            return getResponseInfo(result);
          }
        })
        .catch(() => {
          if (canRetry) {
            return doPostRequest(false);
          }
          return Promise.reject();
        });
    }

    if (usePost) {
      return doPostRequest(true).catch(() => {});
    } else {
      const src = imageUrl + '?d=' + utils.base64URLEncode(jsonBody);
      createImage(src);
      return Promise.resolve();
      // We do not specify an onload handler for the image because we don't want the client to wait around
      // for the image to load - it won't provide a server response, there's nothing to be done.
    }
  }

  sender.sendEvents = function(events, sync) {
    if (!platform.httpRequest) {
      return Promise.resolve();
    }
    // Workaround for non-support of sync XHR in some browsers - https://github.com/launchdarkly/js-client/issues/147
    if (sync && !(platform.httpAllowsSync && platform.httpAllowsSync())) {
      return Promise.resolve();
    }
    const canPost = platform.httpAllowsPost();
    let chunks;
    if (canPost) {
      // no need to break up events into chunks if we can send a POST
      chunks = [events];
    } else {
      chunks = utils.chunkUserEventsForUrl(MAX_URL_LENGTH - eventsUrl.length, events);
    }
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      results.push(sendChunk(chunks[i], canPost, sync));
    }
    return sync ? Promise.resolve() : Promise.all(results);
  };

  return sender;
}
