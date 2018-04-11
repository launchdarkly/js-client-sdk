import * as utils from './utils';

const MAX_URL_LENGTH = 2000;
const hasCors = 'withCredentials' in new XMLHttpRequest();

export default function EventSender(eventsUrl) {
  const sender = {};

  function sendChunk(events, sync) {
    const src = eventsUrl + '?d=' + utils.base64URLEncode(JSON.stringify(events));

    const send = onDone => {
      // Detect browser support for CORS
      if (hasCors) {
        /* supports cross-domain requests */
        const xhr = new XMLHttpRequest();
        xhr.open('GET', src, !sync);

        if (!sync) {
          xhr.addEventListener('load', onDone);
        }

        xhr.send();
      } else {
        const img = new Image();

        if (!sync) {
          img.addEventListener('load', onDone);
        }

        img.src = src;
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
    const finalSync = sync === undefined ? false : sync;
    const chunks = utils.chunkUserEventsForUrl(MAX_URL_LENGTH - eventsUrl.length, events);
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      results.push(sendChunk(chunks[i], finalSync));
    }
    return sync ? Promise.resolve() : Promise.all(results);
  };

  return sender;
}
