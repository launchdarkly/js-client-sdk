import sinon from 'sinon';
import semverCompare from 'semver-compare';

import * as LDClient from '../index';
import * as messages from '../messages';
import { btoa } from '../utils';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const lsKey = 'ld:UNKNOWN_ENVIRONMENT_ID:' + btoa('{"key":"user"}');
  const user = { key: 'user' };
  let warnSpy;
  let errorSpy;
  let xhr;
  let requests = [];

  beforeEach(() => {
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
      client.waitForInitialization().catch(() => {}); // jest doesn't like unhandled rejections
      requests[0].respond(404);
    });

    it('returns default values when an invalid environment key is specified', done => {
      const client = LDClient.initialize('abc', user);
      client.on('error', () => {
        expect(client.variation('flag-key', 1)).toEqual(1);
        done();
      });
      client.waitForInitialization().catch(() => {});
      requests[0].respond(404);
    });

    it('fetches flag settings if bootstrap is not provided (without reasons)', () => {
      LDClient.initialize(envName, user);
      expect(/sdk\/eval/.test(requests[0].url)).toEqual(true);
      expect(/withReasons=true/.test(requests[0].url)).toEqual(false);
    });

    it('fetches flag settings if bootstrap is not provided (with reasons)', () => {
      LDClient.initialize(envName, user, { evaluationReasons: true });
      expect(/sdk\/eval/.test(requests[0].url)).toEqual(true);
      expect(/withReasons=true/.test(requests[0].url)).toEqual(true);
    });

    it('should not fetch flag settings if bootstrap is provided', () => {
      LDClient.initialize(envName, user, {
        bootstrap: {},
      });

      expect(/sdk\/eval/.test(requests[0].url)).toEqual(false); // it's the goals request
    });

    it('logs warning when bootstrap object uses old format', () => {
      LDClient.initialize(envName, user, {
        bootstrap: { foo: 'bar' },
      });

      expect(warnSpy).toHaveBeenCalledWith(messages.bootstrapOldFormat());
    });

    it('does not log warning when bootstrap object uses new format', () => {
      LDClient.initialize(envName, user, {
        bootstrap: { foo: 'bar', $flagsState: { foo: { version: 1 } } },
      });

      expect(warnSpy).not.toHaveBeenCalled();
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

      client
        .waitForInitialization()
        .then(() => {
          expect(window.localStorage.getItem(lsKey)).toEqual(json);
          done();
        })
        .catch(() => {});
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

      client.waitForInitialization().catch(() => {});

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
  });

  describe('waitForInitialization', () => {
    it('resolves promise on successful init', done => {
      const handleReady = jest.fn();
      const client = LDClient.initialize(envName, user, {
        bootstrap: {},
      });

      client.waitForInitialization().then(handleReady);

      client.on('ready', () => {
        setTimeout(() => {
          expect(handleReady).toHaveBeenCalled();
          done();
        }, 0);
      });
    });

    it('rejects promise if flags request fails', done => {
      const client = LDClient.initialize('abc', user);
      client.waitForInitialization().catch(err => {
        expect(err.message).toEqual('Error fetching flag settings: ' + messages.environmentNotFound());
        done();
      });
      requests[0].respond(404);
    });
  });

  describe('variation', () => {
    it('returns value for an existing flag - from bootstrap', () => {
      const client = LDClient.initialize(envName, user, {
        bootstrap: { foo: 'bar', $flagsState: { foo: { version: 1 } } },
      });

      expect(client.variation('foo')).toEqual('bar');
    });

    it('returns value for an existing flag - from bootstrap with old format', () => {
      const client = LDClient.initialize(envName, user, {
        bootstrap: { foo: 'bar' },
      });

      expect(client.variation('foo')).toEqual('bar');
    });

    it('returns value for an existing flag - from polling', done => {
      const client = LDClient.initialize(envName, user);
      client.on('ready', () => {
        expect(client.variation('enable-foo', 1)).toEqual(true);
        done();
      });
      requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        '{"enable-foo": {"value": true, "version": 1, "variation": 2}}'
      );
    });

    it('returns default value for flag that had null value', done => {
      const client = LDClient.initialize(envName, user);
      client.on('ready', () => {
        expect(client.variation('foo', 'default')).toEqual('default');
        done();
      });
      requests[0].respond(200, { 'Content-Type': 'application/json' }, '{"foo": {"value": null, "version": 1}}');
    });

    it('returns default value for unknown flag', () => {
      const client = LDClient.initialize(envName, user, {
        bootstrap: { $flagsState: {} },
      });

      expect(client.variation('foo', 'default')).toEqual('default');
    });
  });

  describe('variationDetail', () => {
    const reason = { kind: 'FALLTHROUGH' };
    it('returns details for an existing flag - from bootstrap', () => {
      const client = LDClient.initialize(envName, user, {
        bootstrap: { foo: 'bar', $flagsState: { foo: { version: 1, variation: 2, reason: reason } } },
      });

      expect(client.variationDetail('foo')).toEqual({ value: 'bar', variationIndex: 2, reason: reason });
    });

    it('returns details for an existing flag - from bootstrap with old format', () => {
      const client = LDClient.initialize(envName, user, {
        bootstrap: { foo: 'bar' },
      });

      expect(client.variationDetail('foo')).toEqual({ value: 'bar', variationIndex: null, reason: null });
    });

    it('returns details for an existing flag - from polling', done => {
      const client = LDClient.initialize(envName, user);
      client.on('ready', () => {
        expect(client.variationDetail('foo', 'default')).toEqual({ value: 'bar', variationIndex: 2, reason: reason });
        done();
      });
      requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        '{"foo": {"value": "bar", "version": 1, "variation": 2, "reason":' + JSON.stringify(reason) + '}}'
      );
    });

    it('returns default value for flag that had null value', done => {
      const client = LDClient.initialize(envName, user);
      client.on('ready', () => {
        expect(client.variationDetail('foo', 'default')).toEqual({
          value: 'default',
          variationIndex: null,
          reason: null,
        });
        done();
      });
      requests[0].respond(200, { 'Content-Type': 'application/json' }, '{"foo": {"value": null, "version": 1}}');
    });

    it('returns default value and error for unknown flag', () => {
      const client = LDClient.initialize(envName, user, {
        bootstrap: { $flagsState: {} },
      });

      expect(client.variationDetail('foo', 'default')).toEqual({
        value: 'default',
        variationIndex: null,
        reason: { kind: 'ERROR', errorKind: 'FLAG_NOT_FOUND' },
      });
    });
  });

  describe('allFlags', () => {
    it('returns flag values', done => {
      const client = LDClient.initialize(envName, user);
      client.on('ready', () => {
        expect(client.allFlags()).toEqual({ key1: 'value1', key2: 'value2' });
        done();
      });
      requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        '{"key1": {"value": "value1", "version": 1, "variation": 2},' +
          '"key2": {"value": "value2", "version": 1, "variation": 2}}'
      );
    });

    it('returns empty map if client is not initialized', () => {
      const client = LDClient.initialize(envName, user);
      expect(client.allFlags()).toEqual({});
    });
  });

  describe('identify', () => {
    it('updates flag values when the user changes', done => {
      const user2 = { key: 'user2' };
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.identify(user2, null, () => {
          expect(client.variation('enable-foo')).toEqual(true);
          done();
        });

        getLastRequest().respond(200, { 'Content-Type': 'application/json' }, '{"enable-foo": {"value": true}}');
      });
    });

    it('yields map of flag values as the result of identify()', done => {
      const user2 = { key: 'user2' };
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.identify(user2, null).then(flagMap => {
          expect(flagMap).toEqual({ 'enable-foo': true });
          done();
        });

        getLastRequest().respond(200, { 'Content-Type': 'application/json' }, '{"enable-foo": {"value": true}}');
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
