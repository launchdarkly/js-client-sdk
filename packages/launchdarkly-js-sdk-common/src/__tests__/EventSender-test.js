import * as base64 from 'base64-js';

import * as stubPlatform from './stubPlatform';
import { errorResponse, makeDefaultServer } from './testUtils';
import EventSender from '../EventSender';
import * as utils from '../utils';

describe('EventSender', () => {
  const platform = stubPlatform.defaults();
  const platformWithoutCors = Object.assign({}, platform, { httpAllowsPost: () => false });
  let server;
  const eventsUrl = '/fake-url';
  const envId = 'env';

  beforeEach(() => {
    server = makeDefaultServer();
  });

  afterEach(() => {
    server.restore();
  });

  function lastRequest() {
    return server.requests[server.requests.length - 1];
  }

  function fakeImageCreator() {
    const ret = function(url) {
      ret.urls.push(url);
    };
    ret.urls = [];
    return ret;
  }

  function base64URLDecode(str) {
    let s = str;
    while (s.length % 4 !== 0) {
      s = s + '=';
    }
    s = s.replace(/_/g, '/').replace(/-/g, '+');
    const decodedBytes = base64.toByteArray(s);
    const decodedStr = String.fromCharCode.apply(String, decodedBytes);
    return decodeURIComponent(escape(decodedStr));
  }

  function decodeOutputFromUrl(url) {
    const prefix = eventsUrl + '/a/' + envId + '.gif?d=';
    if (!url.startsWith(prefix)) {
      throw 'URL "' + url + '" did not have expected prefix "' + prefix + '"';
    }
    return JSON.parse(base64URLDecode(url.substring(prefix.length)));
  }

  describe('using image endpoint when CORS is not available', () => {
    it('should encode events in a single chunk if they fit', async () => {
      const imageCreator = fakeImageCreator();
      const sender = EventSender(platformWithoutCors, eventsUrl, envId, imageCreator);
      const event1 = { kind: 'identify', key: 'userKey1' };
      const event2 = { kind: 'identify', key: 'userKey2' };
      const events = [event1, event2];

      await sender.sendEvents(events, false);

      const urls = imageCreator.urls;
      expect(urls.length).toEqual(1);
      expect(decodeOutputFromUrl(urls[0])).toEqual(events);
    });

    it('should send events in multiple chunks if necessary', async () => {
      const imageCreator = fakeImageCreator();
      const sender = EventSender(platformWithoutCors, eventsUrl, envId, imageCreator);
      const events = [];
      for (let i = 0; i < 80; i++) {
        events.push({ kind: 'identify', key: 'thisIsALongUserKey' + i });
      }

      await sender.sendEvents(events, false);

      const urls = imageCreator.urls;
      expect(urls.length).toEqual(3);
      expect(decodeOutputFromUrl(urls[0])).toEqual(events.slice(0, 31));
      expect(decodeOutputFromUrl(urls[1])).toEqual(events.slice(31, 62));
      expect(decodeOutputFromUrl(urls[2])).toEqual(events.slice(62, 80));
    });
  });

  describe('using POST when CORS is available', () => {
    it('should send all events in request body', async () => {
      const sender = EventSender(platform, eventsUrl, envId);
      const events = [];
      for (let i = 0; i < 80; i++) {
        events.push({ kind: 'identify', key: 'thisIsALongUserKey' + i });
      }
      await sender.sendEvents(events, false);
      const r = lastRequest();
      expect(r.url).toEqual(eventsUrl + '/events/bulk/' + envId);
      expect(r.method).toEqual('POST');
      expect(JSON.parse(r.requestBody)).toEqual(events);
    });

    it('should send custom user-agent header', async () => {
      const sender = EventSender(platform, eventsUrl, envId);
      const event = { kind: 'identify', key: 'userKey' };
      await sender.sendEvents([event], false);
      expect(lastRequest().requestHeaders['X-LaunchDarkly-User-Agent']).toEqual(utils.getLDUserAgentString(platform));
    });

    const retryableStatuses = [400, 408, 429, 500, 503];
    for (const i in retryableStatuses) {
      const status = retryableStatuses[i];
      it('should retry on error ' + status, async () => {
        let n = 0;
        server.respondWith(req => {
          n++;
          req.respond(n >= 2 ? 200 : status);
        });
        const sender = EventSender(platform, eventsUrl, envId);
        const event = { kind: 'false', key: 'userKey' };
        await sender.sendEvents([event], false);
        expect(server.requests.length).toEqual(2);
        expect(JSON.parse(server.requests[1].requestBody)).toEqual([event]);
      });
    }

    it('should not retry more than once', async () => {
      let n = 0;
      server.respondWith(req => {
        n++;
        req.respond(n >= 3 ? 200 : 503);
      });
      const sender = EventSender(platform, eventsUrl, envId);
      const event = { kind: 'false', key: 'userKey' };
      await sender.sendEvents([event], false);
      expect(server.requests.length).toEqual(2);
    });

    it('should not retry on error 401', async () => {
      server.respondWith(errorResponse(401));
      const sender = EventSender(platform, eventsUrl, envId);
      const event = { kind: 'false', key: 'userKey' };
      await sender.sendEvents([event], false);
      expect(server.requests.length).toEqual(1);
    });

    it('should retry on I/O error', async () => {
      let n = 0;
      server.respondWith(req => {
        n++;
        if (n >= 2) {
          req.respond(200);
        } else {
          req.error();
        }
      });
      const sender = EventSender(platform, eventsUrl, envId);
      const event = { kind: 'false', key: 'userKey' };
      await sender.sendEvents([event], false);
      expect(server.requests.length).toEqual(2);
      expect(JSON.parse(server.requests[1].requestBody)).toEqual([event]);
    });
  });

  describe('When HTTP requests are not available at all', () => {
    it('should silently discard events', async () => {
      const sender = EventSender(stubPlatform.withoutHttp(), eventsUrl, envId);
      const event = { kind: 'false', key: 'userKey' };
      await sender.sendEvents([event], false);
      expect(server.requests.length).toEqual(0);
    });
  });
});
