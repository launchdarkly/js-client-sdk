import LRU from 'lru';
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
  const userKeysCache = LRU(options.user_keys_capacity || 1000);
  const userFilter = UserFilter(options);
  const inlineUsers = !!options.inline_users_in_events;
  let queue = [];
  let initialFlush = true;

  function makeOutputEvent(e) {
    if (!e.user) {
      return e;
    }
    if (inlineUsers) {
      return Object.assign({}, e, { user: userFilter.filterUser(e.user) });
    } else {
      const ret = Object.assign({}, e, { userKey: e.user.key });
      delete ret['user'];
      return ret;
    }
  }

  processor.enqueue = function(event) {
    // Add event to the summary counters if appropriate
    summarizer.summarizeEvent(event);

    // For each user we haven't seen before, we add an index event - unless this is already
    // an identify event for that user.
    let addIndexEvent = false;
    if (!inlineUsers) {
      if (event.user && !userKeysCache.get(event.user.key)) {
        userKeysCache.set(event.user.key, true);
        if (event.kind !== 'identify') {
          addIndexEvent = true;
        }
      }
    }

    if (addIndexEvent) {
      queue.push({
        kind: 'index',
        creationDate: event.creationDate,
        user: userFilter.filter_user(event.user),
      });
    }
    queue.push(makeOutputEvent(event));
  };

  processor.flush = function(user, sync) {
    const finalSync = sync === undefined ? false : sync;
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
      queue.push(summary);
    }

    if (queue.length === 0) {
      return Promise.resolve();
    }

    const chunks = utils.chunkUserEventsForUrl(MAX_URL_LENGTH - eventsUrl.length, queue);

    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      results.push(sendEvents(eventsUrl, chunks[i], finalSync));
    }

    queue = [];

    return sync ? Promise.resolve() : Promise.all(results);
  };

  return processor;
}
