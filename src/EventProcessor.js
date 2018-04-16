import EventSender from './EventSender';
import EventSummarizer from './EventSummarizer';
import UserFilter from './UserFilter';

export default function EventProcessor(options, eventsUrl, sender) {
  const processor = {};
  const eventSender = sender || EventSender(eventsUrl);
  const summarizer = EventSummarizer();
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
