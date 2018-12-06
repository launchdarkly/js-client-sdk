import * as xmlhttprequest from 'xmlhttprequest';
import * as storage from 'electron-json-storage';
import { EventSource } from 'launchdarkly-eventsource';

export default function makeElectronPlatform(options) {
  const mockHttp = options && options.mockHttp; // used for unit tests

  const ret = {};

  ret.newHttpRequest = () => (mockHttp ? new window.XMLHttpRequest() : new xmlhttprequest.XMLHttpRequest());

  ret.httpAllowsPost = () => true;

  ret.getCurrentUrl = () => null;

  ret.isDoNotTrack = () => false;

  ret.localStorage = {
    get: storage.get,
    set: storage.set,
    clear: storage.remove,
  };

  ret.eventSourceFactory = (url, options) => new EventSource(url, options);
  ret.eventSourceIsActive = es => es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING;
  ret.eventSourceAllowsReport = true;

  ret.userAgent = 'ElectronClient';

  return ret;
}
