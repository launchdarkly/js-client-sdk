import sinon from 'sinon';
import semverCompare from 'semver-compare';
import EventSource, { sources } from 'eventsourcemock';

import LDClient from '../index';
import * as messages from '../messages';
import { btoa } from '../utils';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const lsKey = 'ld:UNKNOWN_ENVIRONMENT_ID:' + btoa('{"key":"user"}');
  const user = { key: 'user' };
  const encodedUser = 'eyJrZXkiOiJ1c2VyIn0';
  const hash = '012345789abcde';
  let warnSpy;
  let errorSpy;
  let xhr;
  let requests = [];

  beforeEach(() => {
    Object.defineProperty(window, 'EventSource', {
      value: EventSource,
      writable: true,
    });

    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(req) {
      requests.push(req);
    };

    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    requests = [];
    xhr.restore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  function getLastRequest() {
    return requests[requests.length - 1];
  }

  it('should exist', () => {
    expect(LDClient).toBeDefined();
  });

  describe('initialization', () => {
    it('should trigger the ready event', done => {
      const handleReady = jest.fn();
      const client = LDClient.initialize(envName, user, {
        bootstrap: {},
      });

      client.on('ready', handleReady);

      setTimeout(() => {
        expect(handleReady).toHaveBeenCalled();
        done();
      }, 0);
    });

    describe('waitUntilReady', () => {
      it('should resolve waitUntilReady promise when ready', done => {
        const handleReady = jest.fn();
        const client = LDClient.initialize(envName, user, {
          bootstrap: {},
        });

        client.waitUntilReady().then(handleReady);

        client.on('ready', () => {
          setTimeout(() => {
            expect(handleReady).toHaveBeenCalled();
            done();
          }, 0);
        });
      });

      it('should resolve waitUntilReady promise after ready event was already emitted', done => {
        const handleInitialReady = jest.fn();
        const handleReady = jest.fn();
        const client = LDClient.initialize(envName, user, {
          bootstrap: {},
        });

        client.on('ready', handleInitialReady);

        setTimeout(() => {
          client.waitUntilReady().then(handleReady);

          setTimeout(() => {
            expect(handleInitialReady).toHaveBeenCalled();
            expect(handleReady).toHaveBeenCalled();
            done();
          }, 0);
        }, 0);
      });
    });

    it('should resolve waitUntilGoalsReady when goals are loaded', done => {
      const handleGoalsReady = jest.fn();
      const client = LDClient.initialize(envName, user, {
        bootstrap: {},
      });

      client.waitUntilGoalsReady().then(handleGoalsReady);

      client.on('goalsReady', () => {
        setTimeout(() => {
          expect(handleGoalsReady).toHaveBeenCalled();
          done();
        }, 0);
      });

      getLastRequest().respond(200);
    });

    it('should emit an error when an invalid samplingInterval is specified', done => {
      const client = LDClient.initialize(envName, user, {
        bootstrap: {},
        samplingInterval: 'totally not a number',
      });

      client.on('error', err => {
        expect(err.message).toEqual('Invalid sampling interval configured. Sampling interval must be an integer >= 0.');
        done();
      });
    });

    it('should emit an error when initialize is called without an environment key', done => {
      const client = LDClient.initialize('', user, {
        bootstrap: {},
      });
      client.on('error', err => {
        expect(err.message).toEqual(messages.environmentNotSpecified());
        done();
      });
    });

    it('should emit an error when an invalid environment key is specified', done => {
      const client = LDClient.initialize('abc', user);
      client.on('error', err => {
        expect(err.message).toEqual('Error fetching flag settings: ' + messages.environmentNotFound());
        done();
      });
      requests[0].respond(404);
    });

    it('returns default values when an invalid environment key is specified', done => {
      const client = LDClient.initialize('abc', user);
      client.on('error', err => {
        expect(client.variation('flag-key', 1)).toEqual(1);
        done();
      });
      requests[0].respond(404);
    });

    it('should not fetch flag settings since bootstrap is provided', () => {
      LDClient.initialize(envName, user, {
        bootstrap: {},
      });

      const settingsRequest = requests[0];
      expect(/sdk\/eval/.test(settingsRequest.url)).toEqual(false);
    });

    it('should contain package version', () => {
      // Arrange
      const version = LDClient.version;

      // Act: all client bundles above 1.0.7 should contain package version
      // https://github.com/substack/semver-compare
      const result = semverCompare(version, '1.0.6');

      // Assert
      expect(result).toEqual(1);
    });

    it('should clear cached settings if they are invalid JSON', done => {
      window.localStorage.setItem(lsKey, 'foo{bar}');

      const client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage',
      });

      expect(window.localStorage.getItem(lsKey)).toBeNull();

      client.on('ready', () => {
        done();
      });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '{"enable-foo": {"value": true, "version": 1}}');
    });

    it('should not clear cached settings if they are valid JSON', done => {
      const json = '{"enable-thing": true}';

      window.localStorage.setItem(lsKey, json);

      const client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage',
      });

      client.on('ready', () => {
        expect(window.localStorage.getItem(lsKey)).toEqual(json);
        done();
      });
    });

    it('should start with empty flags if we tried to use cached settings and there are none', done => {
      window.localStorage.removeItem(lsKey);

      const client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage',
      });

      // don't wait for ready event - verifying that variation() doesn't throw an error if called before ready
      expect(client.variation('flag-key', 0)).toEqual(0);

      // verify that the flags get requested from LD
      client.on('ready', () => {
        expect(client.variation('flag-key')).toEqual(1);
        done();
      });
      requests[0].respond(200, { 'Content-Type': 'application/json' }, '{"flag-key":{"value":1,"version":1}}');
    });

    it('should handle localStorage getItem throwing an exception', done => {
      // sandbox.restore(window.localStorage.__proto__, 'getItem');
      // sandbox.stub(window.localStorage.__proto__, 'getItem').throws();

      localStorage.getItem.mockImplementationOnce(() => {
        throw new Error();
      });

      const client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage',
      });

      client.on('ready', () => {
        expect(warnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());
        done();
      });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]');
    });

    it('should handle localStorage setItem throwing an exception', done => {
      localStorage.setItem.mockImplementationOnce(() => {
        throw new Error();
      });

      const client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage',
      });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]');

      client.on('ready', () => {
        expect(warnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());
        done();
      });
    });

    it('should not update cached settings if there was an error fetching flags', done => {
      const json = '{"enable-foo": true}';

      window.localStorage.setItem(lsKey, json);

      const server = sinon.fakeServer.create();
      server.respondWith(req => {
        req.respond(503);
      });

      const client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage',
      });

      client.on('ready', () => {
        server.respond();
        setTimeout(() => {
          expect(window.localStorage.getItem(lsKey)).toEqual(json);
          done();
        }, 1);
      });
    });

    it('should use hash as localStorage key when secure mode is enabled', done => {
      const lsKeyHash = 'ld:UNKNOWN_ENVIRONMENT_ID:totallyLegitHash';
      const client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage',
        hash: 'totallyLegitHash',
      });

      client.on('ready', () => {
        expect(JSON.parse(window.localStorage.getItem(lsKeyHash))).toEqual({
          $schema: 1,
          'enable-foo': { value: true, version: 1 },
        });
        done();
      });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '{"enable-foo":{"value":true,"version":1}}');
    });

    it('should clear localStorage when user context is changed', done => {
      const json = '{"enable-foo":{"value":true,"version":1}}';
      const lsKey2 = 'ld:UNKNOWN_ENVIRONMENT_ID:' + btoa('{"key":"user2"}');

      const user2 = { key: 'user2' };
      const client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage',
      });

      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, json]);

      client.on('ready', () => {
        client.identify(user2, null, () => {
          expect(window.localStorage.getItem(lsKey)).toBeNull();
          expect(JSON.parse(window.localStorage.getItem(lsKey2))).toEqual({
            $schema: 1,
            'enable-foo': { value: true, version: 1 },
          });
          done();
        });
        server.respond();
      });
      server.respond();
    });

    it('should not warn when tracking a known custom goal event', done => {
      const client = LDClient.initialize(envName, user, {
        bootstrap: {}, // so the client doesn't request settings
      });

      client.on('ready', () => {
        client.track('known');
        expect(warnSpy).not.toHaveBeenCalledWith('Custom event key does not exist');
        done();
      });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]');
    });

    it('should emit an error when tracking a non-string custom goal event', done => {
      const client = LDClient.initialize(envName, user, {
        bootstrap: {}, // so the client doesn't request settings
      });
      client.on('ready', () => {
        const badCustomEventKeys = [123, [], {}, null, undefined];
        badCustomEventKeys.forEach(key => {
          client.track(key);
          expect(errorSpy).toHaveBeenCalledWith(messages.unknownCustomEventKey(key));
        });
        done();
      });
    });

    it('should warn when tracking an unknown custom goal event', done => {
      const client = LDClient.initialize(envName, user, {
        bootstrap: {}, // so the client doesn't request settings
      });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]');

      client.on('ready', () => {
        client.track('unknown');
        expect(warnSpy).toHaveBeenCalledWith(messages.unknownCustomEventKey('unknown'));
        done();
      });
    });

    it('should emit an error event if there was an error fetching flags', done => {
      const server = sinon.fakeServer.create();
      server.respondWith(req => {
        req.respond(503);
      });

      const client = LDClient.initialize(envName, user);

      const handleError = jest.fn();
      client.on('error', handleError);
      server.respond();

      setTimeout(() => {
        expect(handleError).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should warn about missing user on first event', () => {
      const sandbox = sinon.sandbox.create();
      const warnSpy = sandbox.spy(console, 'warn');
      const client = LDClient.initialize(envName, null);
      client.track('eventkey', null);
      warnSpy.restore();
      sandbox.restore();
      expect(warnSpy.called).toEqual(true);
    });
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

    function expectFeatureEvent(e, key, value, variation, version, defaultVal) {
      expect(e.kind).toEqual('feature');
      expect(e.key).toEqual(key);
      expect(e.value).toEqual(value);
      expect(e.variation).toEqual(variation);
      expect(e.version).toEqual(version);
      expect(e.default).toEqual(defaultVal);
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
        expectFeatureEvent(ep.events[1], 'foo', 'x', undefined, undefined, 'x');

        done();
      });

      server.respond();
    });
  });

  describe('event listening', () => {
    const streamUrl = 'https://clientstream.launchdarkly.com';

    function streamEvents() {
      return sources[`${streamUrl}/eval/${envName}/${encodedUser}`].__emitter._events;
    }

    it('does not connect to the stream by default', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        expect(sources).toMatchObject({});
        done();
      });
    });

    it('connects to the stream when listening to global change events', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change', () => {});
        expect(sources[streamUrl + '/eval/' + envName + '/' + encodedUser]).toBeDefined();
        done();
      });
    });

    it('connects to the stream when listening to change event for one flag', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change:flagkey', () => {});
        expect(sources[streamUrl + '/eval/' + envName + '/' + encodedUser]).toBeDefined();
        done();
      });
    });

    it('passes the secure mode hash in the stream URL if provided', done => {
      const client = LDClient.initialize(envName, user, { hash: hash, bootstrap: {} });

      client.on('ready', () => {
        client.on('change:flagkey', () => {});
        expect(sources[streamUrl + '/eval/' + envName + '/' + encodedUser + '?h=' + hash]).toBeDefined();
        done();
      });
    });

    it('handles stream ping message by getting flags', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change', () => {});
        streamEvents().ping();
        getLastRequest().respond(
          200,
          { 'Content-Type': 'application/json' },
          '{"enable-foo":{"value":true,"version":1}}'
        );
        expect(client.variation('enable-foo')).toEqual(true);
        done();
      });
    });

    it('handles stream put message by updating flags', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change', () => {});

        streamEvents().put({
          data: '{"enable-foo":{"value":true,"version":1}}',
        });

        expect(client.variation('enable-foo')).toEqual(true);
        done();
      });
    });

    it('updates local storage for put message if using local storage', done => {
      window.localStorage.setItem(lsKey, '{"enable-foo":false}');
      const client = LDClient.initialize(envName, user, { bootstrap: 'localstorage' });

      client.on('ready', () => {
        client.on('change', () => {});

        streamEvents().put({
          data: '{"enable-foo":{"value":true,"version":1}}',
        });

        expect(client.variation('enable-foo')).toEqual(true);
        expect(JSON.parse(window.localStorage.getItem(lsKey))).toEqual({
          $schema: 1,
          'enable-foo': { value: true, version: 1 },
        });
        done();
      });
    });

    it('fires global change event when flags are updated from put event', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', () => {
        client.on('change', changes => {
          expect(changes).toEqual({
            'enable-foo': { current: true, previous: false },
          });

          done();
        });

        streamEvents().put({
          data: '{"enable-foo":{"value":true,"version":1}}',
        });
      });
    });

    it('fires individual change event when flags are updated from put event', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', () => {
        client.on('change:enable-foo', (current, previous) => {
          expect(current).toEqual(true);
          expect(previous).toEqual(false);

          done();
        });

        streamEvents().put({
          data: '{"enable-foo":{"value":true,"version":1}}',
        });
      });
    });

    it('handles patch message by updating flag', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', () => {
        client.on('change', () => {});

        streamEvents().patch({ data: '{"key":"enable-foo","value":true,"version":1}' });

        expect(client.variation('enable-foo')).toEqual(true);
        done();
      });
    });

    it('does not update flag if patch version < flag version', done => {
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{"enable-foo":{"value":"a","version":2}}']);

      const client = LDClient.initialize(envName, user);
      client.on('ready', () => {
        expect(client.variation('enable-foo')).toEqual('a');

        client.on('change', () => {});

        streamEvents().patch({ data: '{"key":"enable-foo","value":"b","version":1}' });

        expect(client.variation('enable-foo')).toEqual('a');

        done();
      });
      server.respond();
    });

    it('does not update flag if patch version == flag version', done => {
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{"enable-foo":{"value":"a","version":2}}']);

      const client = LDClient.initialize(envName, user);
      client.on('ready', () => {
        expect(client.variation('enable-foo')).toEqual('a');

        client.on('change', () => {});

        streamEvents().patch({ data: '{"key":"enable-foo","value":"b","version":1}' });

        expect(client.variation('enable-foo')).toEqual('a');

        done();
      });
      server.respond();
    });

    it('updates flag if patch has a version and flag has no version', done => {
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{"enable-foo":{"value":"a"}}']);

      const client = LDClient.initialize(envName, user);
      client.on('ready', () => {
        expect(client.variation('enable-foo')).toEqual('a');

        client.on('change', () => {});

        streamEvents().patch({ data: '{"key":"enable-foo","value":"b","version":1}' });

        expect(client.variation('enable-foo')).toEqual('b');

        done();
      });
      server.respond();
    });

    it('updates flag if flag has a version and patch has no version', done => {
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{"enable-foo":{"value":"a","version":2}}']);

      const client = LDClient.initialize(envName, user);
      client.on('ready', () => {
        expect(client.variation('enable-foo')).toEqual('a');

        client.on('change', () => {});

        streamEvents().patch({ data: '{"key":"enable-foo","value":"b"}' });

        expect(client.variation('enable-foo')).toEqual('b');

        done();
      });
      server.respond();
    });

    it('updates local storage for patch message if using local storage', done => {
      window.localStorage.setItem(lsKey, '{"enable-foo":false}');
      const client = LDClient.initialize(envName, user, { bootstrap: 'localstorage' });

      client.on('ready', () => {
        client.on('change', () => {});

        streamEvents().put({
          data: '{"enable-foo":{"value":true,"version":1}}',
        });

        expect(client.variation('enable-foo')).toEqual(true);
        expect(JSON.parse(window.localStorage.getItem(lsKey))).toEqual({
          $schema: 1,
          'enable-foo': { value: true, version: 1 },
        });
        done();
      });
    });

    it('fires global change event when flag is updated from patch event', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', () => {
        client.on('change', changes => {
          expect(changes).toEqual({
            'enable-foo': { current: true, previous: false },
          });

          done();
        });

        streamEvents().patch({
          data: '{"key":"enable-foo","value":true,"version":1}',
        });
      });
    });

    it('fires individual change event when flag is updated from patch event', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', () => {
        client.on('change:enable-foo', (current, previous) => {
          expect(current).toEqual(true);
          expect(previous).toEqual(false);

          done();
        });

        streamEvents().patch({
          data: '{"key":"enable-foo","value":true,"version":1}',
        });
      });
    });

    it('fires global change event when flag is newly created from patch event', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change', changes => {
          expect(changes).toEqual({
            'enable-foo': { current: true },
          });

          done();
        });

        streamEvents().patch({
          data: '{"key":"enable-foo","value":true,"version":1}',
        });
      });
    });

    it('fires global change event when flag is newly created from patch event', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change:enable-foo', (current, previous) => {
          expect(current).toEqual(true);
          expect(previous).toEqual(undefined);

          done();
        });

        streamEvents().patch({
          data: '{"key":"enable-foo","value":true,"version":1}',
        });
      });
    });

    it('handles delete message by deleting flag', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', () => {
        client.on('change', () => {});

        streamEvents().delete({
          data: '{"key":"enable-foo","version":1}',
        });

        expect(client.variation('enable-foo')).toBeUndefined();
        done();
      });
    });

    it('fires global change event when flag is deleted', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': true } });

      client.on('ready', () => {
        client.on('change', changes => {
          expect(changes).toEqual({
            'enable-foo': { previous: true },
          });

          done();
        });

        streamEvents().delete({
          data: '{"key":"enable-foo","version":1}',
        });
      });
    });

    it('fires individual change event when flag is deleted', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': true } });

      client.on('ready', () => {
        client.on('change:enable-foo', (current, previous) => {
          expect(current).toEqual(undefined);
          expect(previous).toEqual(true);

          done();
        });

        streamEvents().delete({
          data: '{"key":"enable-foo","version":1}',
        });
      });
    });

    it('updates local storage for delete message if using local storage', done => {
      window.localStorage.setItem(lsKey, '{"enable-foo":false}');
      const client = LDClient.initialize(envName, user, { bootstrap: 'localstorage' });

      client.on('ready', () => {
        client.on('change', () => {});

        streamEvents().delete({
          data: '{"key":"enable-foo","version":1}',
        });

        expect(client.variation('enable-foo')).toEqual(undefined);
        expect(JSON.parse(window.localStorage.getItem(lsKey))).toEqual({
          $schema: 1,
          'enable-foo': { version: 1, deleted: true },
        });
        done();
      });
    });

    it('reconnects to stream if the user changes', done => {
      const user2 = { key: 'user2' };
      const encodedUser2 = 'eyJrZXkiOiJ1c2VyMiJ9';
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change', () => {});

        expect(sources[streamUrl + '/eval/' + envName + '/' + encodedUser]).toBeDefined();

        client.identify(user2, null, () => {
          expect(sources[streamUrl + '/eval/' + envName + '/' + encodedUser2]).toBeDefined();
          done();
        });

        getLastRequest().respond(200, { 'Content-Type': 'application/json' }, '{"enable-foo": true}');
      });
    });

    it('returns an error when identify is called with null user', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.identify(null).then(
          () => {
            throw Error('should not have succeeded');
          },
          () => {
            done();
          }
        );
      });
    });

    it('returns an error when identify is called with user with no key', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.identify({ country: 'US' }).then(
          () => {
            throw Error('should not have succeeded');
          },
          () => {
            done();
          }
        );
      });
    });

    it('does not change flag values after identify is called with null user', done => {
      const data = { foo: 'bar' };
      const client = LDClient.initialize(envName, user, { bootstrap: data });

      client.on('ready', () => {
        expect(client.variation('foo', 'x')).toEqual('bar');
        client.identify(null).then(
          () => {
            throw Error('should not have succeeded');
          },
          () => {
            expect(client.variation('foo', 'x')).toEqual('bar');
            done();
          }
        );
      });
    });

    it('does not change flag values after identify is called with invalid user', done => {
      const data = { foo: 'bar' };
      const client = LDClient.initialize(envName, user, { bootstrap: data });

      client.on('ready', () => {
        expect(client.variation('foo', 'x')).toEqual('bar');
        client.identify({ country: 'US' }).then(
          () => {
            throw Error('should not have succeeded');
          },
          () => {
            expect(client.variation('foo', 'x')).toEqual('bar');
            done();
          }
        );
      });
    });
  });
});
