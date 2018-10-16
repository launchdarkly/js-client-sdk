export default function makeBrowserPlatform() {
  const ret = {};
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
  return ret;
}
