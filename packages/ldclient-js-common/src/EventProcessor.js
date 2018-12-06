import EventSender from './EventSender';
import EventSummarizer from './EventSummarizer';
import UserFilter from './UserFilter';
import * as errors from './errors';
import * as messages from './messages';
import * as utils from './utils';

export default function EventProcessor(platform, options, environmentId, logger, emitter = null, sender = null) {
  const processor = {};
  const eventSender = sender || EventSender(platform, options.eventsUrl, environmentId);
  const summarizer = EventSummarizer();
  const userFilter = UserFilter(options);
  const inlineUsers = options.inlineUsersInEvents;
  const samplingInterval = options.samplingInterval;
  const flushInterval = options.flushInterval;
  let queue = [];
  let lastKnownPastTime = 0;
  let disabled = false;
  let flushTimer;

  function shouldSampleEvent() {
    return samplingInterval === 0 || Math.floor(Math.random() * samplingInterval) === 0;
  }

  function shouldDebugEvent(e) {
    if (e.debugEventsUntilDate) {
      // The "last known past time" comes from the last HTTP response we got from the server.
      // In case the client's time is set wrong, at least we know that any expiration date
      // earlier than that point is definitely in the past.  If there's any discrepancy, we
      // want to err on the side of cutting off event debugging sooner.
      return e.debugEventsUntilDate > lastKnownPastTime && e.debugEventsUntilDate > new Date().getTime();
    }
    return false;
  }

  // Transform an event from its internal format to the format we use when sending a payload.
  function makeOutputEvent(e) {
    const ret = utils.extend({}, e);
    if (inlineUsers || e.kind === 'identify') {
      // identify events always have an inline user
      ret.user = userFilter.filterUser(e.user);
    } else {
      ret.userKey = e.user.key;
      delete ret['user'];
    }
    if (e.kind === 'feature') {
      delete ret['trackEvents'];
      delete ret['debugEventsUntilDate'];
    }
    return ret;
  }

  processor.enqueue = function(event) {
    if (disabled) {
      return;
    }
    let addFullEvent = false;
    let addDebugEvent = false;

    // Add event to the summary counters if appropriate
    summarizer.summarizeEvent(event);

    // Decide whether to add the event to the payload. Feature events may be added twice, once for
    // the event (if tracked) and once for debugging.
    if (event.kind === 'feature') {
      if (shouldSampleEvent()) {
        addFullEvent = !!event.trackEvents;
        addDebugEvent = shouldDebugEvent(event);
      }
    } else {
      addFullEvent = shouldSampleEvent();
    }

    if (addFullEvent) {
      queue.push(makeOutputEvent(event));
    }
    if (addDebugEvent) {
      const debugEvent = utils.extend({}, event, { kind: 'debug' });
      delete debugEvent['trackEvents'];
      delete debugEvent['debugEventsUntilDate'];
      delete debugEvent['variation'];
      queue.push(debugEvent);
    }
  };

  processor.flush = function(sync) {
    if (disabled) {
      return Promise.resolve();
    }
    const eventsToSend = queue;
    const summary = summarizer.getSummary();
    summarizer.clearSummary();
    if (summary) {
      summary.kind = 'summary';
      eventsToSend.push(summary);
    }
    if (eventsToSend.length === 0) {
      return Promise.resolve();
    }
    queue = [];
    logger.debug(messages.debugPostingEvents(eventsToSend.length));
    return eventSender.sendEvents(eventsToSend, sync).then(responseInfo => {
      if (responseInfo) {
        if (responseInfo.serverTime) {
          lastKnownPastTime = responseInfo.serverTime;
        }
        if (!errors.isHttpErrorRecoverable(responseInfo.status)) {
          disabled = true;
        }
        if (responseInfo.status >= 400) {
          utils.onNextTick(() => {
            emitter.maybeReportError(
              new errors.LDUnexpectedResponseError(
                messages.httpErrorMessage(responseInfo.status, 'event posting', 'some events were dropped')
              )
            );
          });
        }
      }
    });
  };

  processor.start = function() {
    const flushTick = () => {
      processor.flush();
      flushTimer = setTimeout(flushTick, flushInterval);
    };
    flushTimer = setTimeout(flushTick, flushInterval);
  };

  processor.stop = function() {
    clearTimeout(flushTimer);
  };

  return processor;
}
