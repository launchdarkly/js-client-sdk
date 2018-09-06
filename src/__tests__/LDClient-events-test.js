import sinon from 'sinon';

import * as LDClient from '../index';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  let warnSpy;
  let xhr;
  let requests = [];

  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(req) {
      requests.push(req);
    };

    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    requests = [];
    xhr.restore();
    warnSpy.mockRestore();
  });

  describe('event generation', () => {
    function stubEventProcessor() {
      const ep = { events: [] };
      ep.start = function() {};
      ep.flush = function() {};
      ep.stop = function() {};
      ep.enqueue = function(e) {
        ep.events.push(e);
      };
      return ep;
    }

    function expectIdentifyEvent(e, user) {
      expect(e.kind).toEqual('identify');
      expect(e.user).toEqual(user);
    }

    function expectFeatureEvent(e, key, value, variation, version, defaultVal, trackEvents, debugEventsUntilDate) {
      expect(e.kind).toEqual('feature');
      expect(e.key).toEqual(key);
      expect(e.value).toEqual(value);
      expect(e.variation).toEqual(variation);
      expect(e.version).toEqual(version);
      expect(e.default).toEqual(defaultVal);
      expect(e.trackEvents).toEqual(trackEvents);
      expect(e.debugEventsUntilDate).toEqual(debugEventsUntilDate);
    }

    it('sends an identify event at startup', done => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      server.respondWith([
        200,
        { 'Content-Type': 'application/json' },
        '{"foo":{"value":"a","variation":1,"version":2,"flagVersion":2000}}',
      ]);
      const client = LDClient.initialize(envName, user, { eventProcessor: ep });

      client.on('ready', () => {
        expect(ep.events.length).toEqual(1);
        expectIdentifyEvent(ep.events[0], user);

        done();
      });

      server.respond();
    });

    it('sends a feature event for variation()', done => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      server.respondWith([
        200,
        { 'Content-Type': 'application/json' },
        '{"foo":{"value":"a","variation":1,"version":2,"flagVersion":2000}}',
      ]);
      const client = LDClient.initialize(envName, user, { eventProcessor: ep });

      client.on('ready', () => {
        client.variation('foo', 'x');

        expect(ep.events.length).toEqual(2);
        expectIdentifyEvent(ep.events[0], user);
        expectFeatureEvent(ep.events[1], 'foo', 'a', 1, 2000, 'x');

        done();
      });

      server.respond();
    });

    it('sends a feature event for variationDetail()', done => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      server.respondWith([
        200,
        { 'Content-Type': 'application/json' },
        '{"foo":{"value":"a","variation":1,"version":2,"flagVersion":2000,"reason":{"kind":"OFF"}}}',
      ]);
      const client = LDClient.initialize(envName, user, { eventProcessor: ep });

      client.on('ready', () => {
        client.variationDetail('foo', 'x');

        expect(ep.events.length).toEqual(2);
        expectIdentifyEvent(ep.events[0], user);
        expectFeatureEvent(ep.events[1], 'foo', 'a', 1, 2000, 'x');
        expect(ep.events[1].reason).toEqual({ kind: 'OFF' });

        done();
      });

      server.respond();
    });

    it('uses "version" instead of "flagVersion" in event if "flagVersion" is absent', done => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      server.respondWith([
        200,
        { 'Content-Type': 'application/json' },
        '{"foo":{"value":"a","variation":1,"version":2}}',
      ]);
      const client = LDClient.initialize(envName, user, { eventProcessor: ep });

      client.on('ready', () => {
        client.variation('foo', 'x');

        expect(ep.events.length).toEqual(2);
        expectIdentifyEvent(ep.events[0], user);
        expectFeatureEvent(ep.events[1], 'foo', 'a', 1, 2, 'x');

        done();
      });

      server.respond();
    });

    it('omits event version if flag does not exist', done => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{}']);
      const client = LDClient.initialize(envName, user, { eventProcessor: ep });

      client.on('ready', () => {
        client.variation('foo', 'x');

        expect(ep.events.length).toEqual(2);
        expectIdentifyEvent(ep.events[0], user);
        expectFeatureEvent(ep.events[1], 'foo', 'x', null, undefined, 'x');

        done();
      });

      server.respond();
    });

    it('can get metadata for events from bootstrap object', done => {
      const ep = stubEventProcessor();
      const bootstrapData = {
        foo: 'bar',
        $flagsState: {
          foo: {
            variation: 1,
            version: 2,
            trackEvents: true,
            debugEventsUntilDate: 1000,
          },
        },
      };
      const client = LDClient.initialize(envName, user, { eventProcessor: ep, bootstrap: bootstrapData });

      client.on('ready', () => {
        client.variation('foo', 'x');

        expect(ep.events.length).toEqual(2);
        expectIdentifyEvent(ep.events[0], user);
        expectFeatureEvent(ep.events[1], 'foo', 'bar', 1, 2, 'x', true, 1000);

        done();
      });
    });

    it('sends an event for track()', done => {
      const ep = stubEventProcessor();
      const client = LDClient.initialize(envName, user, { eventProcessor: ep, bootstrap: {} });
      const data = { thing: 'stuff' };
      client.on('ready', () => {
        client.track('eventkey', data);

        expect(ep.events.length).toEqual(2);
        expectIdentifyEvent(ep.events[0], user);
        const trackEvent = ep.events[1];
        expect(trackEvent.kind).toEqual('custom');
        expect(trackEvent.key).toEqual('eventkey');
        expect(trackEvent.user).toEqual(user);
        expect(trackEvent.data).toEqual(data);
        done();
      });
    });
  });
});
