import EventSummarizer from './EventSummarizer';
import UserFilter from './UserFilter';
import * as utils from './utils';

const MAX_URL_LENGTH = 2000;
const hasCors = 'withCredentials' in new XMLHttpRequest();

function sendEvents(eventsUrl, events, sync) {
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

export default function EventProcessor(options, eventsUrl) {
  const processor = {};
  const summarizer = EventSummarizer();
  const userFilter = UserFilter(options);
  let queue = [];
  let initialFlush = true;

  function serializeEvents(events) {
    return events.map(e => (e.user ? Object.assign({}, e, { user: userFilter.filterUser(e.user) }) : e));
  }

  processor.enqueue = function(event) {
    // Add event to the summary counters if appropriate
    summarizer.summarizeEvent(event);
    queue.push(event);
  };

  processor.flush = function(user, sync) {
    const finalSync = sync === undefined ? false : sync;
    const serializedQueue = serializeEvents(queue);
    const summary = summarizer.getSummary();
    summarizer.clearSummary();

    if (!user) {
      if (initialFlush) {
        if (console && console.warn) {
          console.warn(
            'Be sure to call `identify` in the LaunchDarkly client: http://docs.launchdarkly.com/docs/running-an-ab-test#include-the-client-side-snippet'
          );
        }
      }
      return Promise.resolve();
    }

    initialFlush = false;

    if (summary) {
      summary.kind = 'summary';
      serializedQueue.push(summary);
    }

    if (serializedQueue.length === 0) {
      return Promise.resolve();
    }

    const chunks = utils.chunkUserEventsForUrl(MAX_URL_LENGTH - eventsUrl.length, serializedQueue);

    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      results.push(sendEvents(eventsUrl, chunks[i], finalSync));
    }

    queue = [];

    return sync ? Promise.resolve() : Promise.all(results);
  };

  return processor;
}
