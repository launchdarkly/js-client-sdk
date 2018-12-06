export default function makeBrowserPlatform() {
  const ret = {};

  // XMLHttpRequest may not exist if we're running in a server-side rendering context
  if (window.XMLHttpRequest) {
    ret.newHttpRequest = () => new window.XMLHttpRequest();
  }

  let hasCors;
  ret.httpAllowsPost = () => {
    // We compute this lazily because calling XMLHttpRequest() at initialization time can disrupt tests
    if (hasCors === undefined) {
      hasCors = window.XMLHttpRequest ? 'withCredentials' in new window.XMLHttpRequest() : false;
    }
    return hasCors;
  };

  ret.getCurrentUrl = () => window.location.href;

  ret.isDoNotTrack = () => {
    let flag;
    if (window.navigator && window.navigator.doNotTrack !== undefined) {
      flag = window.navigator.doNotTrack; // FF, Chrome
    } else if (window.navigator && window.navigator.msDoNotTrack !== undefined) {
      flag = window.navigator.msDoNotTrack; // IE 9/10
    } else {
      flag = window.doNotTrack; // IE 11+, Safari
    }
    return flag === 1 || flag === true || flag === '1' || flag === 'yes';
  };

  if (window.localStorage) {
    ret.localStorage = {
      get: (key, callback) => {
        try {
          callback(null, window.localStorage.getItem(key));
        } catch (ex) {
          callback(ex);
        }
      },
      set: (key, value, callback) => {
        try {
          window.localStorage.setItem(key, value);
          callback(null);
        } catch (ex) {
          callback(ex);
        }
      },
      clear: (key, callback) => {
        try {
          window.localStorage.removeItem(key);
          callback(null);
        } catch (ex) {
          callback(ex);
        }
      },
    };
  }

  // If EventSource does not exist, the absence of eventSourceFactory will make us not try to open streams
  if (window.EventSource) {
    const timeoutMillis = 300000; // this is only used by polyfills - see below

    ret.eventSourceFactory = url => {
      // The standard EventSource constructor doesn't take any options, just a URL. However, some
      // EventSource polyfills allow us to specify a timeout interval, and in some cases they will
      // default to a too-short timeout if we don't specify one. So, here, we are setting the
      // timeout properties that are used by several popular polyfills.
      const options = {
        heartbeatTimeout: timeoutMillis, // used by "event-source-polyfill" package
        silentTimeout: timeoutMillis, // used by "eventsource-polyfill" package
      };

      return new window.EventSource(url, options);
    };

    ret.eventSourceIsActive = es =>
      es.readyState === window.EventSource.OPEN || es.readyState === window.EventSource.CONNECTING;
  }

  ret.eventSourceAllowsReport = false;

  ret.userAgent = 'JSClient';

  return ret;
}
