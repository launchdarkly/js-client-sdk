import sinon from 'sinon';
import semverCompare from 'semver-compare';

import * as stubPlatform from './stubPlatform';
import * as LDClient from '../index';
import * as messages from '../messages';
import * as utils from '../utils';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  let xhr;
  let requests = [];
  let platform;

  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(req) {
      requests.push(req);
    };

    platform = stubPlatform.defaults();
  });

  afterEach(() => {
    requests = [];
    xhr.restore();
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
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: {},
      });

      client.on('ready', handleReady);

      setTimeout(() => {
        expect(handleReady).toHaveBeenCalled();
        expect(platform.testing.logger.output.info).toEqual([messages.clientInitialized()]);
        done();
      }, 0);
    });

    it('should trigger the initialized event', done => {
      const handleReady = jest.fn();
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: {},
      });

      client.on('initialized', handleReady);

      setTimeout(() => {
        expect(handleReady).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should emit an error when an invalid samplingInterval is specified', done => {
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: {},
        samplingInterval: 'totally not a number',
      });

      client.on('error', err => {
        expect(err.message).toEqual('Invalid sampling interval configured. Sampling interval must be an integer >= 0.');
        done();
      });
    });

    it('should emit an error when initialize is called without an environment key', done => {
      const client = platform.testing.makeClient('', user, {
        bootstrap: {},
      });
      client.on('error', err => {
        expect(err.message).toEqual(messages.environmentNotSpecified());
        done();
      });
    });

    it('should emit an error when an invalid environment key is specified', done => {
      const client = platform.testing.makeClient('abc', user);
      client.on('error', err => {
        expect(err.message).toEqual('Error fetching flag settings: ' + messages.environmentNotFound());
        done();
      });
      client.waitForInitialization().catch(() => {}); // jest doesn't like unhandled rejections
      requests[0].respond(404);
    });

    it('should emit a failure event when an invalid environment key is specified', done => {
      const client = platform.testing.makeClient('abc', user);
      client.on('failed', err => {
        expect(err.message).toEqual('Error fetching flag settings: ' + messages.environmentNotFound());
        done();
      });
      client.waitForInitialization().catch(() => {});
      requests[0].respond(404);
    });

    it('returns default values when an invalid environment key is specified', done => {
      const client = platform.testing.makeClient('abc', user);
      client.on('error', () => {
        expect(client.variation('flag-key', 1)).toEqual(1);
        done();
      });
      client.waitForInitialization().catch(() => {});
      requests[0].respond(404);
    });

    it('fetches flag settings if bootstrap is not provided (without reasons)', () => {
      platform.testing.makeClient(envName, user, {});
      expect(/sdk\/eval/.test(requests[0].url)).toEqual(true);
      expect(/withReasons=true/.test(requests[0].url)).toEqual(false);
    });

    it('fetches flag settings if bootstrap is not provided (with reasons)', () => {
      platform.testing.makeClient(envName, user, { evaluationReasons: true });
      expect(/sdk\/eval/.test(requests[0].url)).toEqual(true);
      expect(/withReasons=true/.test(requests[0].url)).toEqual(true);
    });

    it('should not fetch flag settings if bootstrap is provided', () => {
      platform.testing.makeClient(envName, user, {
        bootstrap: {},
      });
      expect(requests.length).toEqual(0);
    });

    it('logs warning when bootstrap object uses old format', () => {
      platform.testing.makeClient(envName, user, { bootstrap: { foo: 'bar' } });

      expect(platform.testing.logger.output.warn).toEqual([messages.bootstrapOldFormat()]);
    });

    it('does not log warning when bootstrap object uses new format', () => {
      platform.testing.makeClient(envName, user, {
        bootstrap: { foo: 'bar', $flagsState: { foo: { version: 1 } } },
      });

      expect(platform.testing.logger.output.warn).toEqual([]);
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

    it('should not warn when tracking a custom event', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.track('known');
        expect(platform.testing.logger.output.warn).toEqual([]);
        done();
      });
    });

    it('should emit an error when tracking a non-string custom event', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });
      client.on('ready', () => {
        const badCustomEventKeys = [123, [], {}, null, undefined];
        badCustomEventKeys.forEach(key => {
          platform.testing.logger.reset();
          client.track(key);
          expect(platform.testing.logger.output.error).toEqual([messages.unknownCustomEventKey(key)]);
        });
        done();
      });
    });

    it('should emit an error event if there was an error fetching flags', done => {
      const server = sinon.fakeServer.create();
      server.respondWith(req => {
        req.respond(503);
      });

      const client = platform.testing.makeClient(envName, user, {});

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
      const client = platform.testing.makeClient(envName, null);
      client.track('eventkey', null);
      sandbox.restore();
      expect(platform.testing.logger.output.warn).toEqual([messages.eventWithoutUser()]);
    });

    function verifyCustomHeader(sendLDHeaders, shouldGetHeaders) {
      platform.testing.makeClient(envName, user, { sendLDHeaders: sendLDHeaders });
      const request = requests[0];
      expect(request.requestHeaders['X-LaunchDarkly-User-Agent']).toEqual(
        shouldGetHeaders ? utils.getLDUserAgentString(platform) : undefined
      );
    }

    it('sends custom header by default', () => {
      verifyCustomHeader(undefined, true);
    });

    it('sends custom header if sendLDHeaders is true', () => {
      verifyCustomHeader(true, true);
    });

    it('does not send custom header if sendLDHeaders is false', () => {
      verifyCustomHeader(undefined, true);
    });
  });

  describe('waitUntilReady', () => {
    it('should resolve waitUntilReady promise when ready', done => {
      const handleReady = jest.fn();
      const client = platform.testing.makeClient(envName, user, {
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
      const client = platform.testing.makeClient(envName, user, {
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

  describe('waitForInitialization', () => {
    it('resolves promise on successful init', done => {
      const handleReady = jest.fn();
      const client = platform.testing.makeClient(envName, user, {
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
      const client = platform.testing.makeClient('abc', user, {});
      client.waitForInitialization().catch(err => {
        expect(err.message).toEqual('Error fetching flag settings: ' + messages.environmentNotFound());
        done();
      });
      requests[0].respond(404);
    });
  });

  describe('variation', () => {
    it('returns value for an existing flag - from bootstrap', () => {
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: { foo: 'bar', $flagsState: { foo: { version: 1 } } },
      });

      expect(client.variation('foo')).toEqual('bar');
    });

    it('returns value for an existing flag - from bootstrap with old format', () => {
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: { foo: 'bar' },
      });

      expect(client.variation('foo')).toEqual('bar');
    });

    it('returns value for an existing flag - from polling', done => {
      const client = platform.testing.makeClient(envName, user, {});
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
      const client = platform.testing.makeClient(envName, user, {});
      client.on('ready', () => {
        expect(client.variation('foo', 'default')).toEqual('default');
        done();
      });
      requests[0].respond(200, { 'Content-Type': 'application/json' }, '{"foo": {"value": null, "version": 1}}');
    });

    it('returns default value for unknown flag', () => {
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: { $flagsState: {} },
      });

      expect(client.variation('foo', 'default')).toEqual('default');
    });
  });

  describe('variationDetail', () => {
    const reason = { kind: 'FALLTHROUGH' };
    it('returns details for an existing flag - from bootstrap', () => {
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: { foo: 'bar', $flagsState: { foo: { version: 1, variation: 2, reason: reason } } },
      });

      expect(client.variationDetail('foo')).toEqual({ value: 'bar', variationIndex: 2, reason: reason });
    });

    it('returns details for an existing flag - from bootstrap with old format', () => {
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: { foo: 'bar' },
      });

      expect(client.variationDetail('foo')).toEqual({ value: 'bar', variationIndex: null, reason: null });
    });

    it('returns details for an existing flag - from polling', done => {
      const client = platform.testing.makeClient(envName, user, {});
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
      const client = platform.testing.makeClient(envName, user, {});
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
      const client = platform.testing.makeClient(envName, user, {
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
      const client = platform.testing.makeClient(envName, user, {});
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
      const client = platform.testing.makeClient(envName, user);
      expect(client.allFlags()).toEqual({});
    });
  });

  describe('identify', () => {
    it('updates flag values when the user changes', done => {
      const user2 = { key: 'user2' };
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.identify(user2, null, () => {
          expect(client.variation('enable-foo')).toEqual(true);
          done();
        });

        utils.onNextTick(() =>
          getLastRequest().respond(200, { 'Content-Type': 'application/json' }, '{"enable-foo": {"value": true}}')
        );
      });
    });

    it('yields map of flag values as the result of identify()', done => {
      const user2 = { key: 'user2' };
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.identify(user2, null).then(flagMap => {
          expect(flagMap).toEqual({ 'enable-foo': true });
          done();
        });

        utils.onNextTick(() =>
          getLastRequest().respond(200, { 'Content-Type': 'application/json' }, '{"enable-foo": {"value": true}}')
        );
      });
    });

    it('returns an error when identify is called with null user', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

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
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

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
      const client = platform.testing.makeClient(envName, user, { bootstrap: data });

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
      const client = platform.testing.makeClient(envName, user, { bootstrap: data });

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

  describe('initializing with stateProvider', () => {
    it('immediately uses initial state if available, and does not make an HTTP request', done => {
      const user = { key: 'user' };
      const state = {
        environment: 'env',
        user: user,
        flags: { flagkey: { value: 'value' } },
      };
      const sp = stubPlatform.mockStateProvider(state);

      const client = platform.testing.makeClient(null, null, { stateProvider: sp });
      expect(client.variation('flagkey')).toEqual('value');
      expect(requests.length).toEqual(0);

      client.waitForInitialization().then(done);
    });

    it('defers initialization if initial state not available, and does not make an HTTP request', () => {
      const sp = stubPlatform.mockStateProvider(null);

      platform.testing.makeClient(null, null, { stateProvider: sp });
      expect(requests.length).toEqual(0);
    });

    it('finishes initialization on receiving init event', done => {
      const user = { key: 'user' };
      const state = {
        environment: 'env',
        user: user,
        flags: { flagkey: { value: 'value' } },
      };
      const sp = stubPlatform.mockStateProvider(null);

      const client = platform.testing.makeClient(null, null, { stateProvider: sp });

      sp.emit('init', state);

      client.waitForInitialization().then(() => {
        expect(client.variation('flagkey')).toEqual('value');
        done();
      });
    });

    it('updates flags on receiving update event', done => {
      const user = { key: 'user' };
      const state0 = {
        environment: 'env',
        user: user,
        flags: { flagkey: { value: 'value0' } },
      };
      const sp = stubPlatform.mockStateProvider(state0);

      const client = platform.testing.makeClient(null, null, { stateProvider: sp });

      client.waitForInitialization().then(() => {
        expect(client.variation('flagkey')).toEqual('value0');

        const state1 = {
          flags: { flagkey: { value: 'value1' } },
        };

        client.on('change:flagkey', (newValue, oldValue) => {
          expect(newValue).toEqual('value1');
          expect(oldValue).toEqual('value0');
          expect(client.variation('flagkey')).toEqual('value1');

          done();
        });

        sp.emit('update', state1);
      });
    });

    it('disables identify()', done => {
      const user = { key: 'user' };
      const user1 = { key: 'user1' };
      const state = { environment: 'env', user: user, flags: { flagkey: { value: 'value' } } };
      const sp = stubPlatform.mockStateProvider(state);

      const client = platform.testing.makeClient(null, null, { stateProvider: sp });

      sp.emit('init', state);

      client.waitForInitialization().then(() => {
        client.identify(user1, null, (err, newFlags) => {
          expect(err).toEqual(null);
          expect(newFlags).toEqual({ flagkey: 'value' });
          expect(requests.length).toEqual(0);
          expect(platform.testing.logger.output.warn).toEqual([messages.identifyDisabled()]);
          done();
        });
      });
    });
  });
});
