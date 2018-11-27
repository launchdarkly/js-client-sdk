import * as xmlhttprequest from 'xmlhttprequest';
import * as storage from 'electron-json-storage';

// eventsource code is in CommonJS
const EventSource = require('./eventsource');

export default function makeElectronPlatform() {
  const ret = {};

  ret.newHttpRequest = () => new xmlhttprequest.XMLHttpRequest();

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

  return ret;
}
