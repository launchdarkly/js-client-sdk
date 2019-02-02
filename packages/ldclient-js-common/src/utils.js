import * as base64 from 'base64-js';
import fastDeepEqual from 'fast-deep-equal';

// See http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
export function btoa(s) {
  const escaped = unescape(encodeURIComponent(s));
  return base64.fromByteArray(stringToBytes(escaped));
}

function stringToBytes(s) {
  const b = [];
  for (let i = 0; i < s.length; i++) {
    b.push(s.charCodeAt(i));
  }
  return b;
}

export function base64URLEncode(s) {
  return (
    btoa(s)
      // eslint-disable-next-line
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  );
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function deepEquals(a, b) {
  return fastDeepEqual(a, b);
}

// Events emitted in LDClient's initialize method will happen before the consumer
// can register a listener, so defer them to next tick.
export function onNextTick(cb) {
  setTimeout(cb, 0);
}

/**
 * Wrap a promise to invoke an optional callback upon resolution or rejection.
 *
 * This function assumes the callback follows the Node.js callback type: (err, value) => void
 *
 * If a callback is provided:
 *   - if the promise is resolved, invoke the callback with (null, value)
 *   - if the promise is rejected, invoke the callback with (error, null)
 *
 * @param {Promise<any>} promise
 * @param {Function} callback
 * @returns Promise<any> | undefined
 */
export function wrapPromiseCallback(promise, callback) {
  const ret = promise.then(
    value => {
      if (callback) {
        setTimeout(() => {
          callback(null, value);
        }, 0);
      }
      return value;
    },
    error => {
      if (callback) {
        setTimeout(() => {
          callback(error, null);
        }, 0);
      } else {
        return Promise.reject(error);
      }
    }
  );

  return !callback ? ret : undefined;
}

/**
 * Takes a map of flag keys to values, and returns the more verbose structure used by the
 * client stream.
 */
export function transformValuesToVersionedValues(flags) {
  const ret = {};
  for (const key in flags) {
    if (flags.hasOwnProperty(key)) {
      ret[key] = { value: flags[key], version: 0 };
    }
  }
  return ret;
}

/**
 * Converts the internal flag state map to a simple map of flag keys to values.
 */
export function transformVersionedValuesToValues(flagsState) {
  const ret = {};
  for (const key in flagsState) {
    if (flagsState.hasOwnProperty(key)) {
      ret[key] = flagsState[key].value;
    }
  }
  return ret;
}

/**
 * Returns an array of event groups each of which can be safely URL-encoded
 * without hitting the safe maximum URL length of certain browsers.
 *
 * @param {number} maxLength maximum URL length targeted
 * @param {Array[Object}]} events queue of events to divide
 * @returns Array[Array[Object]]
 */
export function chunkUserEventsForUrl(maxLength, events) {
  const allEvents = events.slice(0);
  const allChunks = [];
  let remainingSpace = maxLength;
  let chunk;

  while (allEvents.length > 0) {
    chunk = [];

    while (remainingSpace > 0) {
      const event = allEvents.shift();
      if (!event) {
        break;
      }
      remainingSpace = remainingSpace - base64URLEncode(JSON.stringify(event)).length;
      // If we are over the max size, put this one back on the queue
      // to try in the next round, unless this event alone is larger
      // than the limit, in which case, screw it, and try it anyway.
      if (remainingSpace < 0 && chunk.length > 0) {
        allEvents.unshift(event);
      } else {
        chunk.push(event);
      }
    }

    remainingSpace = maxLength;
    allChunks.push(chunk);
  }

  return allChunks;
}

export function getLDUserAgentString(platform) {
  return platform.userAgent + '/' + VERSION;
}

export function addLDHeaders(xhr, platform) {
  xhr.setRequestHeader('X-LaunchDarkly-User-Agent', getLDUserAgentString(platform));
}

export function extend(...objects) {
  return objects.reduce((acc, obj) => ({ ...acc, ...obj }), {});
}
