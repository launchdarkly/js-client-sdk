import sinon from 'sinon';

import * as stubPlatform from './stubPlatform';
import { makeBootstrap, numericUser, stringifiedNumericUser } from './testUtils';

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

    it('sends an identify event at startup', async () => {
      const ep = stubEventProcessor();
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: {} });
      await client.waitForInitialization();

      expect(ep.events.length).toEqual(1);
      expectIdentifyEvent(ep.events[0], user);
    });

    it('stringifies user attributes in the identify event at startup', async () => {
      // This just verifies that the event is being sent with the sanitized user, not the user that was passed in
      const ep = stubEventProcessor();
      const client = platform.testing.makeClient(envName, numericUser, { eventProcessor: ep, bootstrap: {} });
      await client.waitForInitialization();

      expect(ep.events.length).toEqual(1);
      expectIdentifyEvent(ep.events[0], stringifiedNumericUser);
    });

    it('sends an identify event when identify() is called', async () => {
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{}']);
      server.autoRespond = true; // necessary because otherwise await client.identify() will wait forever

      const ep = stubEventProcessor();
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: {} });
      const user1 = { key: 'user1' };
      await client.waitForInitialization();

      expect(ep.events.length).toEqual(1);
      await client.identify(user1);
      server.respond();

      expect(ep.events.length).toEqual(2);
      expectIdentifyEvent(ep.events[1], user1);
    });

    it('stringifies user attributes in the identify event when identify() is called', async () => {
      // This just verifies that the event is being sent with the sanitized user, not the user that was passed in
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{}']);
      server.autoRespond = true; // necessary because otherwise await client.identify() will wait forever

      const ep = stubEventProcessor();
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: {} });
      await client.waitForInitialization();

      expect(ep.events.length).toEqual(1);
      await client.identify(numericUser);

      expect(ep.events.length).toEqual(2);
      expectIdentifyEvent(ep.events[1], stringifiedNumericUser);
    });

    it('does not send an identify event if doNotTrack is set', async () => {
      platform.testing.setDoNotTrack(true);
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{}']);
      server.autoRespond = true; // necessary because otherwise await client.identify() will wait forever

      const ep = stubEventProcessor();
      const client = platform.testing.makeClient(envName, user, {
        eventProcessor: ep,
        bootstrap: {},
        fetchGoals: false,
      });
      const user1 = { key: 'user1' };

      await client.waitForInitialization();
      await client.identify(user1);

      expect(ep.events.length).toEqual(0);
    });

    it('sends a feature event for variation()', async () => {
      const data = makeBootstrap({ foo: { value: 'a', variation: 1, version: 2, flagVersion: 2000 } });
      const ep = stubEventProcessor();
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: data });

      await client.waitForInitialization();

      client.variation('foo', 'x');

      expect(ep.events.length).toEqual(2);
      expectIdentifyEvent(ep.events[0], user);
      expectFeatureEvent(ep.events[1], 'foo', 'a', 1, 2000, 'x');
    });

    it('sends a feature event for variationDetail()', async () => {
      const data = makeBootstrap({
        foo: { value: 'a', variation: 1, version: 2, flagVersion: 2000, reason: { kind: 'OFF' } },
      });
      const ep = stubEventProcessor();
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: data });

      await client.waitForInitialization();
      client.variationDetail('foo', 'x');

      expect(ep.events.length).toEqual(2);
      expectIdentifyEvent(ep.events[0], user);
      expectFeatureEvent(ep.events[1], 'foo', 'a', 1, 2000, 'x');
      expect(ep.events[1].reason).toEqual({ kind: 'OFF' });
    });

    it('sends a feature event on receiving a new flag value', async () => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      server.autoRespond = true;
      const oldFlags = { foo: { value: 'a', variation: 1, version: 2, flagVersion: 2000 } };
      const newFlags = { foo: { value: 'b', variation: 2, version: 3, flagVersion: 2001 } };

      server.respondWith([200, { 'Content-Type': 'application/json' }, JSON.stringify(oldFlags)]);

      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep });
      await client.waitForInitialization();

      const user1 = { key: 'user1' };
      server.respondWith([200, { 'Content-Type': 'application/json' }, JSON.stringify(newFlags)]);
      await client.identify(user1);

      expect(ep.events.length).toEqual(3);
      expectIdentifyEvent(ep.events[0], user);
      expectIdentifyEvent(ep.events[1], user1);
      expectFeatureEvent(ep.events[2], 'foo', 'b', 2, 2001);
    });

    it('does not send a feature event for a new flag value if sendEventsOnlyForVariation is set', async () => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      server.autoRespond = true;
      const oldFlags = { foo: { value: 'a', variation: 1, version: 2, flagVersion: 2000 } };
      const newFlags = { foo: { value: 'b', variation: 2, version: 3, flagVersion: 2001 } };

      server.respondWith([200, { 'Content-Type': 'application/json' }, JSON.stringify(oldFlags)]);

      const client = platform.testing.makeClient(envName, user, {
        eventProcessor: ep,
        sendEventsOnlyForVariation: true,
      });
      await client.waitForInitialization();

      const user1 = { key: 'user1' };
      server.respondWith([200, { 'Content-Type': 'application/json' }, JSON.stringify(newFlags)]);
      await client.identify(user1);

      expect(ep.events.length).toEqual(2);
      expectIdentifyEvent(ep.events[0], user);
      expectIdentifyEvent(ep.events[1], user1);
    });

    it('does not send a feature event for a new flag value if there is a state provider', async () => {
      const ep = stubEventProcessor();
      const server = sinon.fakeServer.create();
      server.autoRespond = true;
      server.respondWith([
        200,
        { 'Content-Type': 'application/json' },
        '{"foo":{"value":"a","variation":1,"version":2,"flagVersion":2000}}',
      ]);
      const oldFlags = { foo: { value: 'a', variation: 1, version: 2, flagVersion: 2000 } };
      const newFlags = { foo: { value: 'b', variation: 2, version: 3, flagVersion: 2001 } };
      const sp = stubPlatform.mockStateProvider({ environment: envName, user: user, flags: oldFlags });
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, stateProvider: sp });

      await client.waitForInitialization();

      sp.emit('update', { flags: newFlags });

      expect(client.variation('foo')).toEqual('b');
      expect(ep.events.length).toEqual(1);
    });

    it('sends feature events for allFlags()', async () => {
      const ep = stubEventProcessor();
      const boots = makeBootstrap({
        foo: { value: 'a', variation: 1, version: 2 },
        bar: { value: 'b', variation: 1, version: 3 },
      });
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: boots });

      await client.waitForInitialization();
      client.allFlags();

      expect(ep.events.length).toEqual(3);
      expectIdentifyEvent(ep.events[0], user);
      expectFeatureEvent(ep.events[1], 'foo', 'a', 1, 2, null);
      expectFeatureEvent(ep.events[2], 'bar', 'b', 1, 3, null);
    });

    it('does not send feature events for allFlags() if sendEventsOnlyForVariation is set', async () => {
      const ep = stubEventProcessor();
      const boots = makeBootstrap({
        foo: { value: 'a', variation: 1, version: 2 },
        bar: { value: 'b', variation: 1, version: 3 },
      });
      const client = platform.testing.makeClient(envName, user, {
        eventProcessor: ep,
        bootstrap: boots,
        sendEventsOnlyForVariation: true,
      });

      await client.waitForInitialization();
      client.allFlags();

      expect(ep.events.length).toEqual(1);
      expectIdentifyEvent(ep.events[0], user);
    });

    it('uses "version" instead of "flagVersion" in event if "flagVersion" is absent', async () => {
      const ep = stubEventProcessor();
      const boots = makeBootstrap({ foo: { value: 'a', variation: 1, version: 2 } });
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: boots });

      await client.waitForInitialization();
      client.variation('foo', 'x');

      expect(ep.events.length).toEqual(2);
      expectIdentifyEvent(ep.events[0], user);
      expectFeatureEvent(ep.events[1], 'foo', 'a', 1, 2, 'x');
    });

    it('omits event version if flag does not exist', async () => {
      const ep = stubEventProcessor();
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: {} });

      await client.waitForInitialization();
      client.variation('foo', 'x');

      expect(ep.events.length).toEqual(2);
      expectIdentifyEvent(ep.events[0], user);
      expectFeatureEvent(ep.events[1], 'foo', 'x', null, undefined, 'x');
    });

    it('can get metadata for events from bootstrap object', async () => {
      const ep = stubEventProcessor();
      const bootstrapData = makeBootstrap({
        foo: {
          value: 'bar',
          variation: 1,
          version: 2,
          trackEvents: true,
          debugEventsUntilDate: 1000,
        },
      });
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: bootstrapData });

      await client.waitForInitialization();
      client.variation('foo', 'x');

      expect(ep.events.length).toEqual(2);
      expectIdentifyEvent(ep.events[0], user);
      expectFeatureEvent(ep.events[1], 'foo', 'bar', 1, 2, 'x', true, 1000);
    });

    it('sends an event for track()', async () => {
      const ep = stubEventProcessor();
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: {} });
      const data = { thing: 'stuff' };
      await client.waitForInitialization();
      client.track('eventkey', data);

      expect(ep.events.length).toEqual(2);
      expectIdentifyEvent(ep.events[0], user);
      const trackEvent = ep.events[1];
      expect(trackEvent.kind).toEqual('custom');
      expect(trackEvent.key).toEqual('eventkey');
      expect(trackEvent.user).toEqual(user);
      expect(trackEvent.data).toEqual(data);
      expect(trackEvent.url).toEqual(fakeUrl);
    });

    it('does not send an event for track() if doNotTrack is set', async () => {
      platform.testing.setDoNotTrack(true);
      const ep = stubEventProcessor();
      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, bootstrap: {} });
      const data = { thing: 'stuff' };
      await client.waitForInitialization();
      client.track('eventkey', data);
      expect(ep.events.length).toEqual(0);
    });

    it('allows stateProvider to take over sending an event', async () => {
      const ep = stubEventProcessor();

      const sp = stubPlatform.mockStateProvider({ environment: envName, user: user, flags: {} });
      const divertedEvents = [];
      sp.enqueueEvent = event => divertedEvents.push(event);

      const client = platform.testing.makeClient(envName, user, { eventProcessor: ep, stateProvider: sp });
      await client.waitForInitialization();

      client.track('eventkey');
      expect(ep.events.length).toEqual(0);
      expect(divertedEvents.length).toEqual(1);
      expect(divertedEvents[0].kind).toEqual('custom');
    });
  });
});
