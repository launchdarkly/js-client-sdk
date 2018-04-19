import Base64 from 'Base64';
import sinon from 'sinon';

import EventSender from '../EventSender';

describe('EventSender', () => {
  let sandbox;
  let xhr;
  let requests = [];
  let warnSpy;
  const eventsUrl = '/fake-url';

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    requests = [];
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(xhr) {
      requests.push(xhr);
    };
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    sandbox.restore();
    xhr.restore();
    warnSpy.mockRestore();
  });

  function lastRequest() {
    return requests[requests.length - 1];
  }

  function base64URLDecode(str) {
    let s = str;
    while (s.length % 4 !== 0) {
      s = s + '=';
    }
    s = s.replace(/_/g, '/').replace(/-/g, '+');
    return decodeURIComponent(escape(Base64.atob(s)));
  }

  function decodeOutputFromUrl(url) {
    const prefix = eventsUrl + '?d=';
    if (!url.startsWith(prefix)) {
      throw 'URL "' + url + '" did not have expected prefix "' + prefix + '"';
    }
    return JSON.parse(base64URLDecode(url.substring(prefix.length)));
  }

  it('should send asynchronously', () => {
    const sender = EventSender(eventsUrl);
    const event = { kind: 'identify', key: 'userKey' };
    sender.sendEvents([event], false);
    lastRequest().respond();
    expect(lastRequest().async).toEqual(true);
  });

  it('should send synchronously', () => {
    const sender = EventSender(eventsUrl);
    const event = { kind: 'identify', key: 'userKey' };
    sender.sendEvents([event], true);
    lastRequest().respond();
    expect(lastRequest().async).toEqual(false);
  });

  it('should encode events in a single chunk if they fit', done => {
    const sender = EventSender(eventsUrl);
    const event1 = { kind: 'identify', key: 'userKey1' };
    const event2 = { kind: 'identify', key: 'userKey2' };
    const events = [event1, event2];
    sender.sendEvents(events, true).then(() => {
      expect(decodeOutputFromUrl(lastRequest().url)).toEqual(events);
      done();
    });
    lastRequest().respond();
  });

  it('should send events in multiple chunks if necessary', done => {
    const sender = EventSender(eventsUrl);
    const events = [];
    for (let i = 0; i < 80; i++) {
      events.push({ kind: 'identify', key: 'thisIsALongUserKey' + i });
    }
    sender.sendEvents(events, true).then(() => {
      var realRequests = [];
      // The array of requests will also contain empty requests from our CORS-checking logic
      for (let i = 0; i < requests.length; i++) {
        if (requests[i].url) {
          realRequests.push(requests[i]);
        }
      }
      expect(realRequests.length).toEqual(3);
      const output0 = decodeOutputFromUrl(realRequests[0].url);
      const output1 = decodeOutputFromUrl(realRequests[1].url);
      const output2 = decodeOutputFromUrl(realRequests[2].url);
      expect(output0).toEqual(events.slice(0, 31));
      expect(output1).toEqual(events.slice(31, 62));
      expect(output2).toEqual(events.slice(62, 80));
      done();
    });
    lastRequest().respond();
  });
});
