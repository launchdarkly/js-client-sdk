export default function makeBrowserPlatform() {
  const ret = {};

  // XMLHttpRequest may not exist if we're running in a server-side rendering context
  if (XMLHttpRequest) {
    ret.newHttpRequest = () => new XMLHttpRequest();
  }

  let hasCors;
  ret.httpAllowsPost = () => {
    // We compute this lazily because calling XMLHttpRequest() at initialization time can disrupt tests
    if (hasCors === undefined) {
      hasCors = XMLHttpRequest ? 'withCredentials' in new XMLHttpRequest() : false;
    }
    return hasCors;
  };

  ret.getCurrentUrl = () => window.location.href;

  ret.isDoNotTrack = () => {
    let flag;
    if (window.navigator && window.navigator.doNotTrack !== undefined) {
      flag = navigator.doNotTrack; // FF, Chrome
    } else if (window.navigator && window.navigator.msDoNotTrack !== undefined) {
      flag = window.navigator.msDoNotTrack; // IE 9/10
    } else {
      flag = window.doNotTrack; // IE 11+, Safari
    }
    return flag === 1 || flag === true || flag === '1' || flag === 'yes';
  };

  // If EventSource does not exist, the absence of eventSourceFactory will make us not try to open streams
  if (window.EventSource) {
    ret.eventSourceFactory = url => new window.EventSource(url);
  }

  ret.eventSourceAllowsReport = false;

  return ret;
}
