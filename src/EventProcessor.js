var utils = require('./utils');

var MAX_URL_LENGTH = 2000;
var hasCors = 'withCredentials' in new XMLHttpRequest();

function sendEvents(eventsUrl, events, sync) {
  var src = eventsUrl + '?d=' + utils.base64URLEncode(JSON.stringify(events));
  
  var send = function(onDone) {
    // Detect browser support for CORS
    if (hasCors) {
      /* supports cross-domain requests */
      var xhr = new XMLHttpRequest();
      xhr.open('GET', src, !sync);

      if (!sync) {
        xhr.addEventListener('load', onDone);
      }

      xhr.send();
    } else {
      var img = new Image();

      if (!sync) {
        img.addEventListener('load', onDone);
      }

      img.src = src;
    }
  }

  if (sync) {
    send();
  } else {
    return new Promise(function(resolve) {
      send(resolve);
    });
  }
}

function EventProcessor(eventsUrl, eventSerializer) {
  var processor = {};
  var queue = [];
  var initialFlush = true;
  
  processor.enqueue = function(event) {
    queue.push(event);
  };

  processor.flush = function(user, sync) {
    var finalSync = sync === undefined ? false : sync;
    var serializedQueue = eventSerializer.serialize_events(queue);
    var chunks;
    var results = [];

    if (!user) {
      if (initialFlush) {
        console && console.warn && console.warn('Be sure to call `identify` in the LaunchDarkly client: http://docs.launchdarkly.com/docs/running-an-ab-test#include-the-client-side-snippet');
      }
      return Promise.resolve();
    }
    
    initialFlush = false;

    if (serializedQueue.length === 0) {
      return Promise.resolve();
    }

    chunks = utils.chunkUserEventsForUrl(MAX_URL_LENGTH - eventsUrl.length, serializedQueue);
    
    for (var i=0 ; i < chunks.length ; i++) {
      results.push(sendEvents(eventsUrl, chunks[i], finalSync));
    }

    queue = [];

    return sync ? Promise.resolve() : Promise.all(results);
  };
  
  return processor;
}

module.exports = EventProcessor;
