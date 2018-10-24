// taken from https://github.com/aslakhellesoy/eventsource-node/blob/v0.1.6/package.json

import * as url from 'url';
const parse = url.parse;
import * as events from 'events';
import * as https from 'https';
import * as http from 'http';
import * as util from 'util';

function isPlainObject(obj) {
  return Object.getPrototypeOf(obj) === Object.prototype;
}

/**
 * Creates a new EventSource object
 *
 * @param {String} url the URL to which to connect
 * @param {Object} eventSourceOptions extra init params. See README for details.
 * @api public
 **/
export default function EventSource(url, eventSourceOptions) {
  let connectUrl = url;
  let readyState = EventSource.CONNECTING;
  const eventSourceInitDict = eventSourceOptions;

  Object.defineProperty(this, 'readyState', {
    get: () => readyState,
  });

  Object.defineProperty(this, 'url', {
    get: () => connectUrl,
  });

  const self = this;
  self.reconnectInterval = 1000;
  let connectPending = false;
  let reconnectUrl = null;

  function onConnectionClosed() {
    if (connectPending || readyState === EventSource.CLOSED) {
      return;
    }
    connectPending = true;
    readyState = EventSource.CONNECTING;
    _emit('error', new Event('error', { message: 'Connection closed, reconnecting' }));

    // The url may have been changed by a temporary
    // redirect. If that's the case, revert it now.
    if (reconnectUrl) {
      connectUrl = reconnectUrl;
      reconnectUrl = null;
    }
    setTimeout(() => {
      if (readyState !== EventSource.CONNECTING) {
        return;
      }
      connect();
    }, self.reconnectInterval);
  }

  let req;
  let lastEventId = '';
  if (
    eventSourceInitDict &&
    eventSourceInitDict.headers &&
    isPlainObject(eventSourceInitDict.headers) &&
    eventSourceInitDict.headers['Last-Event-ID']
  ) {
    lastEventId = eventSourceInitDict.headers['Last-Event-ID'];
    delete eventSourceInitDict.headers['Last-Event-ID'];
  }

  let discardTrailingNewline = false,
    data = '',
    eventName = '';

  // let backoffDelay = 125; // TODO

  function connect() {
    connectPending = false;

    const options = parse(connectUrl);
    const isSecure = options.protocol === 'https:';
    options.headers = { 'Cache-Control': 'no-cache', Accept: 'text/event-stream' };
    options.agent = eventSourceInitDict.agent;
    if (lastEventId) {
      options.headers['Last-Event-ID'] = lastEventId;
    }
    if (eventSourceInitDict && eventSourceInitDict.headers && isPlainObject(eventSourceInitDict.headers)) {
      for (const i in eventSourceInitDict.headers) {
        const header = eventSourceInitDict.headers[i];
        if (header) {
          options.headers[i] = header;
        }
      }
    }

    options.rejectUnauthorized = !(eventSourceInitDict && eventSourceInitDict.rejectUnauthorized === false);

    req = (isSecure ? https : http).request(options, res => {
      // Handle HTTP redirects
      if (res.statusCode === 301 || res.statusCode === 307) {
        if (!res.headers.location) {
          // Server sent redirect response without Location header.
          _emit('error', new Event('error', { status: res.statusCode }));
          return;
        }
        if (res.statusCode === 307) {
          reconnectUrl = connectUrl;
        }
        connectUrl = res.headers.location;
        process.nextTick(connect);
        return;
      }

      if (res.statusCode !== 200) {
        // reconnect after an error, unless it's an unrecoverable error
        _emit('error', new Event('error', { status: res.statusCode }));
        return;
      }

      readyState = EventSource.OPEN;
      // backoffDelay = 125; // TODO
      res.on('close', onConnectionClosed);
      res.on('end', onConnectionClosed);
      _emit('open', new Event('open'));

      // text/event-stream parser adapted from webkit's
      // Source/WebCore/page/EventSource.cpp
      let buf = '';
      res.on('data', chunk => {
        buf += chunk;

        let pos = 0;
        const length = buf.length;
        while (pos < length) {
          if (discardTrailingNewline) {
            if (buf[pos] === '\n') {
              ++pos;
            }
            discardTrailingNewline = false;
          }

          let lineLength = -1,
            fieldLength = -1,
            c;

          for (let i = pos; lineLength < 0 && i < length; ++i) {
            c = buf[i];
            if (c === ':') {
              if (fieldLength < 0) {
                fieldLength = i - pos;
              }
            } else if (c === '\r') {
              discardTrailingNewline = true;
              lineLength = i - pos;
            } else if (c === '\n') {
              lineLength = i - pos;
            }
          }

          if (lineLength < 0) {
            break;
          }

          parseEventStreamLine(buf, pos, fieldLength, lineLength);

          pos += lineLength + 1;
        }

        if (pos === length) {
          buf = '';
        } else if (pos > 0) {
          buf = buf.slice(pos);
        }
      });
    });

    req.on('error', onConnectionClosed);
    req.setNoDelay(true);
    req.setSocketKeepAlive(true);
    req.end();
  }

  connect();

  function _emit() {
    if (self.listeners(arguments[0]).length > 0) {
      self.emit.apply(self, arguments);
    }
  }

  this.close = () => {
    if (readyState === EventSource.CLOSED) {
      return;
    }
    readyState = EventSource.CLOSED;
    req.abort();
  };

  function parseEventStreamLine(buf, startPos, fieldLength, lineLength) {
    let pos = startPos;
    if (lineLength === 0) {
      if (data.length > 0) {
        const type = eventName || 'message';
        _emit(
          type,
          new MessageEvent(type, {
            data: data.slice(0, -1), // remove trailing newline
            lastEventId: lastEventId,
            //origin: original(url)  // we're not using this - removed it so we can drop the dependency on "original"
          })
        );
        data = '';
      }
      eventName = void 0;
    } else if (fieldLength > 0) {
      const noValue = fieldLength < 0;
      let step = 0;
      const field = buf.slice(pos, pos + (noValue ? lineLength : fieldLength));

      if (noValue) {
        step = lineLength;
      } else if (buf[pos + fieldLength + 1] !== ' ') {
        step = fieldLength + 1;
      } else {
        step = fieldLength + 2;
      }
      pos += step;
      const valueLength = lineLength - step,
        value = buf.slice(pos, pos + valueLength);

      if (field === 'data') {
        data += value + '\n';
      } else if (field === 'event') {
        eventName = value;
      } else if (field === 'id') {
        lastEventId = value;
      } else if (field === 'retry') {
        const retry = parseInt(value, 10);
        if (!Number.isNaN(retry)) {
          self.reconnectInterval = retry;
        }
      }
    }
  }
}

util.inherits(EventSource, events.EventEmitter);
EventSource.prototype.constructor = EventSource; // make stacktraces readable

['open', 'error', 'message'].forEach(method => {
  Object.defineProperty(EventSource.prototype, 'on' + method, {
    /**
     * Returns the current listener
     *
     * @return {Mixed} the set function or undefined
     * @api private
     */
    get: () => {
      const listener = this.listeners(method)[0];
      if (listener) {
        return listener._listener ? listener._listener : listener;
      } else {
        return undefined;
      }
    },

    /**
     * Start listening for events
     *
     * @param {Function} listener the listener
     * @return {Mixed} the set function or undefined
     * @api private
     */
    set: listener => {
      this.removeAllListeners(method);
      this.addEventListener(method, listener);
    },
  });
});

/**
 * Ready states
 */
Object.defineProperty(EventSource, 'CONNECTING', { enumerable: true, value: 0 });
Object.defineProperty(EventSource, 'OPEN', { enumerable: true, value: 1 });
Object.defineProperty(EventSource, 'CLOSED', { enumerable: true, value: 2 });

/**
 * Emulates the W3C Browser based WebSocket interface using addEventListener.
 *
 * @param {String} method Listen for an event
 * @param {Function} listener callback
 * @see https://developer.mozilla.org/en/DOM/element.addEventListener
 * @see http://dev.w3.org/html5/websockets/#the-websocket-interface
 * @api public
 */
EventSource.prototype.addEventListener = function addEventListener(method, listener) {
  if (typeof listener === 'function') {
    // store a reference so we can return the original function again
    const l = listener;
    l._listener = listener;
    this.on(method, listener);
  }
};

/**
 * W3C Event
 *
 * @see http://www.w3.org/TR/DOM-Level-3-Events/#interface-Event
 * @api private
 */
function Event(type, optionalProperties) {
  Object.defineProperty(this, 'type', { writable: false, value: type, enumerable: true });
  if (optionalProperties) {
    for (const f in optionalProperties) {
      if (optionalProperties.hasOwnProperty(f)) {
        Object.defineProperty(this, f, { writable: false, value: optionalProperties[f], enumerable: true });
      }
    }
  }
}

/**
 * W3C MessageEvent
 *
 * @see http://www.w3.org/TR/webmessaging/#event-definitions
 * @api private
 */
function MessageEvent(type, eventInitDict) {
  Object.defineProperty(this, 'type', { writable: false, value: type, enumerable: true });
  for (const f in eventInitDict) {
    if (eventInitDict.hasOwnProperty(f)) {
      Object.defineProperty(this, f, { writable: false, value: eventInitDict[f], enumerable: true });
    }
  }
}
