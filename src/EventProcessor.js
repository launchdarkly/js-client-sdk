import LRU from 'lru';
import EventSender from './EventSender';
import EventSummarizer from './EventSummarizer';
import UserFilter from './UserFilter';

export default function EventProcessor(options, eventsUrl, sender) {
  const processor = {};
  const eventSender = sender || EventSender(eventsUrl);
  const summarizer = EventSummarizer();
  const userKeysCache = LRU(options.user_keys_capacity || 1000);
  const userFilter = UserFilter(options);
  const inlineUsers = !!options.inlineUsersInEvents;
  let queue = [];
  let initialFlush = true;

  function makeOutputEvent(e) {
    if (!e.user) {
      return e;
    }
    if (inlineUsers || e.kind === 'identify') { // identify events always have an inline user
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
        user: userFilter.filterUser(event.user),
      });
    }
    queue.push(makeOutputEvent(event));
  };

  processor.flush = function(user, sync) {
    const eventsToSend = queue;
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
      eventsToSend.push(summary);
    }

    if (eventsToSend.length === 0) {
      return Promise.resolve();
    }
    queue = [];
    return eventSender.sendEvents(eventsToSend, sync);
  };

  return processor;
}
