import * as errors from './errors';
import * as utils from './utils';

const MAX_URL_LENGTH = 2000;

export default function EventSender(platform, eventsUrl, environmentId, imageCreator) {
  const postUrl = eventsUrl + '/events/bulk/' + environmentId;
  const imageUrl = eventsUrl + '/a/' + environmentId + '.gif';
  const sender = {};

  function loadUrlUsingImage(src, onDone) {
    const img = new window.Image();
    if (onDone) {
      img.addEventListener('load', onDone);
    }
    img.src = src;
  }

  function getResponseInfo(xhr) {
    const ret = { status: xhr.status };
    const dateStr = xhr.getResponseHeader('Date');
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
    const send = onDone => {
      function createRequest(canRetry) {
        const xhr = platform.newHttpRequest();
        xhr.open('POST', postUrl, !sync);
        utils.addLDHeaders(xhr, platform);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-LaunchDarkly-Event-Schema', '3');
        if (!sync) {
          xhr.addEventListener('load', () => {
            if (xhr.status >= 400 && errors.isHttpErrorRecoverable(xhr.status) && canRetry) {
              createRequest(false).send(jsonBody);
            } else {
              onDone(getResponseInfo(xhr));
            }
          });
          if (canRetry) {
            xhr.addEventListener('error', () => {
              createRequest(false).send(jsonBody);
            });
          }
        }
        return xhr;
      }
      if (usePost) {
        createRequest(true).send(jsonBody);
      } else {
        const src = imageUrl + '?d=' + utils.base64URLEncode(jsonBody);
        createImage(src, sync ? null : onDone);
      }
    };

    if (sync) {
      send();
    } else {
      return new Promise(resolve => {
        send(resolve);
      });
    }
  }

  sender.sendEvents = function(events, sync) {
    if (!platform.newHttpRequest) {
      return Promise.resolve();
    }
    const canPost = platform.httpAllowsPost();
    const finalSync = sync === undefined ? false : sync;
    let chunks;
    if (canPost) {
      // no need to break up events into chunks if we can send a POST
      chunks = [events];
    } else {
      chunks = utils.chunkUserEventsForUrl(MAX_URL_LENGTH - eventsUrl.length, events);
    }
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      results.push(sendChunk(chunks[i], canPost, finalSync));
    }
    return sync ? Promise.resolve() : Promise.all(results);
  };

  return sender;
}
