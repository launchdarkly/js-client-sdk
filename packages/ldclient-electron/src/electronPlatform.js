import * as xmlhttprequest from 'xmlhttprequest';
import EventSource from 'eventsource';

export default function makeElectronPlatform() {
  const ret = {};

  ret.newHttpRequest = () => new xmlhttprequest.XMLHttpRequest();

  ret.httpAllowsPost = () => true;

  ret.getCurrentUrl = () => null;

  ret.isDoNotTrack = () => false;

  ret.localStorage = null; // TODO

  ret.eventSourceFactory = url => new EventSource(url); // TODO: allow REPORT
  ret.eventSourceIsActive = es => es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING;
  ret.eventSourceAllowsReport = false;

  return ret;
}
