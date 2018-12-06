import sinon from 'sinon';

import * as stubPlatform from './stubPlatform';
import * as utils from '../utils';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  const fakeUrl = 'http://fake';
  let platform;
  let xhr;
  let requests = [];

  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(req) {
      requests.push(req);
    };

    platform = stubPlatform.defaults();
    platform.testing.setCurrentUrl(fakeUrl);
  });

  afterEach(() => {
    requests = [];
    xhr.restore();
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
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: {} });

      client.on('ready', () => {
        expect(ep.events.length).toEqual(1);
        expectIdentifyEvent(ep.events[0], user);

        done();
      });
    });

    it('sends an identify event when identify() is called', done => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{}']);
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: {} });
      const user1 = { key: 'user1' };

      client.on('ready', () => {
        expect(ep.events.length).toEqual(1);
        client.identify(user1).then(() => {
          expect(ep.events.length).toEqual(2);
          expectIdentifyEvent(ep.events[1], user1);
          done();
        });
        utils.onNextTick(() => server.respond());
      });
    });

    it('does not send an identify event if doNotTrack is set', done => {
      platform.testing.setDoNotTrack(true);
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{}']);
      const ep = stubEventProcessor();
      const client = platform.testing.makeClient(envName, user, {
        eventProcessor: ep,
        bootstrap: {},
        fetchGoals: false,
      });
      const user1 = { key: 'user1' };

      client.on('ready', () => {
        client.identify(user1).then(() => {
          expect(ep.events.length).toEqual(0);
          done();
        });
        utils.onNextTick(() => server.respond());
      });
    });

    it('sends a feature event for variation()', done => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      server.respondWith([
        200,
        { 'Content-Type': 'application/json' },
        '{"foo":{"value":"a","variation":1,"version":2,"flagVersion":2000}}',
      ]);
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep });

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
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep });

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

    it('sends a feature event on receiving a new flag value', done => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      const oldFlags = { foo: { value: 'a', variation: 1, version: 2, flagVersion: 2000 } };
      const newFlags = { foo: { value: 'b', variation: 2, version: 3, flagVersion: 2001 } };

      server.respondWith([200, { 'Content-Type': 'application/json' }, JSON.stringify(oldFlags)]);

      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep });
      client.on('ready', () => {
        const user1 = { key: 'user1' };
        server.respondWith([200, { 'Content-Type': 'application/json' }, JSON.stringify(newFlags)]);

        client.identify(user1, null, () => {
          expect(ep.events.length).toEqual(3);
          expectIdentifyEvent(ep.events[0], user);
          expectIdentifyEvent(ep.events[1], user1);
          expectFeatureEvent(ep.events[2], 'foo', 'b', 2, 2001);

          done();
        });

        utils.onNextTick(() => server.respond());
      });

      utils.onNextTick(() => server.respond());
    });

    it('does not send a feature event for a new flag value if sendEventsOnlyForVariation is set', done => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      const oldFlags = { foo: { value: 'a', variation: 1, version: 2, flagVersion: 2000 } };
      const newFlags = { foo: { value: 'b', variation: 2, version: 3, flagVersion: 2001 } };

      server.respondWith([200, { 'Content-Type': 'application/json' }, JSON.stringify(oldFlags)]);

      const client = platform.testing.makeClient(envName, user, {
        eventProcessor: ep,
        sendEventsOnlyForVariation: true,
      });
      client.on('ready', () => {
        const user1 = { key: 'user1' };
        server.respondWith([200, { 'Content-Type': 'application/json' }, JSON.stringify(newFlags)]);

        client.identify(user1, null, () => {
          expect(ep.events.length).toEqual(2);
          expectIdentifyEvent(ep.events[0], user);
          expectIdentifyEvent(ep.events[1], user1);

          done();
        });

        utils.onNextTick(() => server.respond());
      });

      utils.onNextTick(() => server.respond());
    });

    it('does not send a feature event for a new flag value if there is a state provider', done => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      server.respondWith([
        200,
        { 'Content-Type': 'application/json' },
        '{"foo":{"value":"a","variation":1,"version":2,"flagVersion":2000}}',
      ]);
      const oldFlags = { foo: { value: 'a', variation: 1, version: 2, flagVersion: 2000 } };
      const newFlags = { foo: { value: 'b', variation: 2, version: 3, flagVersion: 2001 } };
      const sp = stubPlatform.mockStateProvider({ environment: envName, user: user, flags: oldFlags });
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, stateProvider: sp });

      client.on('ready', () => {
        sp.emit('update', { flags: newFlags });

        expect(client.variation('foo')).toEqual('b');
        expect(ep.events.length).toEqual(1);

        done();
      });
    });

    it('sends feature events for allFlags()', done => {
      const ep = stubEventProcessor();
      const boots = {
        foo: 'a',
        bar: 'b',
        $flagsState: {
          foo: { variation: 1, version: 2 },
          bar: { variation: 1, version: 3 },
        },
      };
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: boots });

      client.on('ready', () => {
        client.allFlags();

        expect(ep.events.length).toEqual(3);
        expectIdentifyEvent(ep.events[0], user);
        expectFeatureEvent(ep.events[1], 'foo', 'a', 1, 2, null);
        expectFeatureEvent(ep.events[2], 'bar', 'b', 1, 3, null);

        done();
      });
    });

    it('does not send feature events for allFlags() if sendEventsOnlyForVariation is set', done => {
      const ep = stubEventProcessor();
      const boots = {
        foo: 'a',
        bar: 'b',
        $flagsState: {
          foo: { variation: 1, version: 2 },
          bar: { variation: 1, version: 3 },
        },
      };
      const client = platform.testing.makeClient(envName, user, {
        eventProcessor: ep,
        bootstrap: boots,
        sendEventsOnlyForVariation: true,
      });

      client.on('ready', () => {
        client.allFlags();

        expect(ep.events.length).toEqual(1);
        expectIdentifyEvent(ep.events[0], user);

        done();
      });
    });

    it('uses "version" instead of "flagVersion" in event if "flagVersion" is absent', done => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      server.respondWith([
        200,
        { 'Content-Type': 'application/json' },
        '{"foo":{"value":"a","variation":1,"version":2}}',
      ]);
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep });

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
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep });

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
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: bootstrapData });

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
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: {} });
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
        expect(trackEvent.url).toEqual(fakeUrl);
        done();
      });
    });

    it('does not send an event for track() if doNotTrack is set', done => {
      platform.testing.setDoNotTrack(true);
      const ep = stubEventProcessor();
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: {} });
      const data = { thing: 'stuff' };
      client.on('ready', () => {
        client.track('eventkey', data);
        expect(ep.events.length).toEqual(0);
        done();
      });
    });

    it('allows stateProvider to take over sending an event', done => {
      const ep = stubEventProcessor();

      const sp = stubPlatform.mockStateProvider({ environment: envName, user: user, flags: {} });
      const divertedEvents = [];
      sp.enqueueEvent = event => divertedEvents.push(event);

      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, stateProvider: sp });

      client.on('ready', () => {
        client.track('eventkey');
        expect(ep.events.length).toEqual(0);
        expect(divertedEvents.length).toEqual(1);
        expect(divertedEvents[0].kind).toEqual('custom');
        done();
      });
    });
  });
});
