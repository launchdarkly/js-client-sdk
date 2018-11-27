import * as xmlhttprequest from 'xmlhttprequest';
import EventSource from 'eventsource';
import * as storage from 'electron-json-storage';

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

  ret.eventSourceFactory = url => new EventSource(url); // TODO: allow REPORT
  ret.eventSourceIsActive = es => es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING;
  ret.eventSourceAllowsReport = false;

  return ret;
}
