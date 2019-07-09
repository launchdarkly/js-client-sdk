import semverCompare from 'semver-compare';

import * as stubPlatform from './stubPlatform';
import {
  asyncify,
  errorResponse,
  jsonResponse,
  makeBootstrap,
  makeDefaultServer,
  numericUser,
  promiseListener,
  stringifiedNumericUser,
} from './testUtils';

import * as LDClient from '../index';
import * as errors from '../errors';
import * as messages from '../messages';
import * as utils from '../utils';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  let platform;
  let server;

  beforeEach(() => {
    server = makeDefaultServer();
    platform = stubPlatform.defaults();
  });

  afterEach(() => {
    server.restore();
  });

  it('should exist', () => {
    expect(LDClient).toBeDefined();
  });

  describe('initialization', () => {
    it('should trigger the ready event', async () => {
      const client = platform.testing.makeClient(envName, user);
      const gotReady = promiseListener();
      client.on('ready', gotReady.callback);

      await gotReady;
      expect(platform.testing.logger.output.info).toEqual([messages.clientInitialized()]);
    });

    it('should trigger the initialized event', async () => {
      const client = platform.testing.makeClient(envName, user);
      const gotInited = promiseListener();
      client.on('initialized', gotInited.callback);

      await gotInited;
    });

    it('should emit an error when an invalid samplingInterval is specified', async () => {
      const client = platform.testing.makeClient(envName, user, {
        samplingInterval: 'totally not a number',
      });
      const gotError = promiseListener();
      client.on('error', gotError.callback);

      const err = await gotError;
      expect(err.message).toEqual('Invalid sampling interval configured. Sampling interval must be an integer >= 0.');
    });

    it('should emit an error when initialize is called without an environment key', async () => {
      const client = platform.testing.makeClient('', user);
      const gotError = promiseListener();
      client.on('error', gotError.callback);

      const err = await gotError;
      expect(err.message).toEqual(messages.environmentNotSpecified());
    });

    it('should emit an error when an invalid environment key is specified', async () => {
      server.respondWith(errorResponse(404));

      const client = platform.testing.makeClient('abc', user);
      const gotError = promiseListener();
      client.on('error', gotError.callback);

      await expect(client.waitForInitialization()).rejects.toThrow();

      const err = await gotError;
      expect(err).toEqual(new errors.LDInvalidEnvironmentIdError(messages.environmentNotFound()));
    });

    it('should emit a failure event when an invalid environment key is specified', async () => {
      server.respondWith(errorResponse(404));

      const client = platform.testing.makeClient('abc', user);
      const gotFailed = promiseListener();
      client.on('failed', gotFailed.callback);

      await expect(client.waitForInitialization()).rejects.toThrow();

      const err = await gotFailed;
      expect(err).toEqual(new errors.LDInvalidEnvironmentIdError(messages.environmentNotFound()));
    });

    it('returns default values when an invalid environment key is specified', async () => {
      server.respondWith(errorResponse(404));

      const client = platform.testing.makeClient('abc', user);

      await expect(client.waitForInitialization()).rejects.toThrow();

      expect(client.variation('flag-key', 1)).toEqual(1);
    });

    it('fetches flag settings if bootstrap is not provided (without reasons)', async () => {
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      expect(/sdk\/eval/.test(server.requests[0].url)).toEqual(true);
      expect(/withReasons=true/.test(server.requests[0].url)).toEqual(false);
    });

    it('fetches flag settings if bootstrap is not provided (with reasons)', async () => {
      const client = platform.testing.makeClient(envName, user, { evaluationReasons: true });
      await client.waitForInitialization();

      expect(/sdk\/eval/.test(server.requests[0].url)).toEqual(true);
      expect(/withReasons=true/.test(server.requests[0].url)).toEqual(true);
    });

    it('should contain package version', () => {
      const version = LDClient.version;
      // All client bundles above 1.0.7 should contain package version
      const result = semverCompare(version, '1.0.6');
      expect(result).toEqual(1);
    });

    it('should not warn when tracking a custom event', async () => {
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      client.track('known');
      expect(platform.testing.logger.output.warn).toEqual([]);
    });

    it('should emit an error when tracking a non-string custom event', async () => {
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      const badCustomEventKeys = [123, [], {}, null, undefined];
      badCustomEventKeys.forEach(key => {
        platform.testing.logger.reset();
        client.track(key);
        expect(platform.testing.logger.output.error).toEqual([messages.unknownCustomEventKey(key)]);
      });
    });

    it('should emit an error event if there was an error fetching flags', async () => {
      server.respondWith(errorResponse(503));

      const client = platform.testing.makeClient(envName, user);

      const gotError = promiseListener();
      client.on('error', gotError.callback);

      await expect(client.waitForInitialization()).rejects.toThrow();
      await gotError;
    });

    it('should warn about missing user on first event', () => {
      const client = platform.testing.makeClient(envName, null);
      client.track('eventkey', null);
      expect(platform.testing.logger.output.warn).toEqual([messages.eventWithoutUser()]);
    });

    async function verifyCustomHeader(sendLDHeaders, shouldGetHeaders) {
      const client = platform.testing.makeClient(envName, user, { sendLDHeaders: sendLDHeaders });
      await client.waitForInitialization();
      const request = server.requests[0];
      expect(request.requestHeaders['X-LaunchDarkly-User-Agent']).toEqual(
        shouldGetHeaders ? utils.getLDUserAgentString(platform) : undefined
      );
    }

    it('sends custom header by default', () => verifyCustomHeader(undefined, true));

    it('sends custom header if sendLDHeaders is true', () => verifyCustomHeader(true, true));

    it('does not send custom header if sendLDHeaders is false', () => verifyCustomHeader(undefined, true));

    it('sanitizes the user', async () => {
      const client = platform.testing.makeClient(envName, numericUser);
      await client.waitForInitialization();
      expect(client.getUser()).toEqual(stringifiedNumericUser);
    });

    it('provides a persistent key for an anonymous user with no key', async () => {
      const anonUser = { anonymous: true, country: 'US' };
      const client0 = platform.testing.makeClient(envName, anonUser);
      await client0.waitForInitialization();

      const newUser0 = client0.getUser();
      expect(newUser0.key).toEqual(expect.anything());
      expect(newUser0).toMatchObject(anonUser);

      const client1 = platform.testing.makeClient(envName, anonUser);
      await client1.waitForInitialization();

      const newUser1 = client1.getUser();
      expect(newUser1).toEqual(newUser0);
    });

    it('provides a key for an anonymous user with no key, even if local storage is unavailable', async () => {
      platform.localStorage = null;

      const anonUser = { anonymous: true, country: 'US' };
      const client0 = platform.testing.makeClient(envName, anonUser);
      await client0.waitForInitialization();

      const newUser0 = client0.getUser();
      expect(newUser0.key).toEqual(expect.anything());
      expect(newUser0).toMatchObject(anonUser);

      const client1 = platform.testing.makeClient(envName, anonUser);
      await client1.waitForInitialization();

      const newUser1 = client1.getUser();
      expect(newUser1.key).toEqual(expect.anything());
      // This key is probably different from newUser0.key, but that depends on execution time, so we can't count on it.
      expect(newUser1).toMatchObject(anonUser);
    });
  });

  describe('initialization with bootstrap object', () => {
    it('should not fetch flag settings', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });
      await client.waitForInitialization();

      expect(server.requests.length).toEqual(0);
    });

    it('makes flags available immediately before ready event', async () => {
      const initData = makeBootstrap({ foo: { value: 'bar', version: 1 } });
      const client = platform.testing.makeClient(envName, user, { bootstrap: initData });

      expect(client.variation('foo')).toEqual('bar');
    });

    it('logs warning when bootstrap object uses old format', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { foo: 'bar' } });
      await client.waitForInitialization();

      expect(platform.testing.logger.output.warn).toEqual([messages.bootstrapOldFormat()]);
    });

    it('does not log warning when bootstrap object uses new format', async () => {
      const initData = makeBootstrap({ foo: { value: 'bar', version: 1 } });
      const client = platform.testing.makeClient(envName, user, { bootstrap: initData });
      await client.waitForInitialization();

      expect(platform.testing.logger.output.warn).toEqual([]);
      expect(client.variation('foo')).toEqual('bar');
    });
  });

  describe('waitUntilReady', () => {
    it('should resolve waitUntilReady promise when ready', async () => {
      const client = platform.testing.makeClient(envName, user);
      const gotReady = promiseListener();
      client.on('ready', gotReady.callback);

      await gotReady;
      await client.waitUntilReady();
    });
  });

  describe('waitForInitialization', () => {
    it('resolves promise on successful init', async () => {
      const client = platform.testing.makeClient(envName, user);
      const gotReady = promiseListener();
      client.on('ready', gotReady.callback);

      await gotReady;
      await client.waitForInitialization();
    });

    it('rejects promise if flags request fails', async () => {
      server.respondWith(errorResponse(404));

      const client = platform.testing.makeClient('abc', user);
      const err = new errors.LDInvalidEnvironmentIdError(messages.environmentNotFound());
      await expect(client.waitForInitialization()).rejects.toThrow(err);
    });
  });

  describe('variation', () => {
    it('returns value for an existing flag - from bootstrap', async () => {
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: makeBootstrap({ foo: { value: 'bar', version: 1 } }),
      });
      await client.waitForInitialization();

      expect(client.variation('foo')).toEqual('bar');
    });

    it('returns value for an existing flag - from bootstrap with old format', async () => {
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: { foo: 'bar' },
      });
      await client.waitForInitialization();

      expect(client.variation('foo')).toEqual('bar');
    });

    it('returns value for an existing flag - from polling', async () => {
      server.respondWith(jsonResponse({ 'enable-foo': { value: true, version: 1, variation: 2 } }));

      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      expect(client.variation('enable-foo', 1)).toEqual(true);
    });

    it('returns default value for flag that had null value', async () => {
      server.respondWith(jsonResponse({ 'enable-foo': { value: null, version: 1 } }));

      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      expect(client.variation('foo', 'default')).toEqual('default');
    });

    it('returns default value for unknown flag', async () => {
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      expect(client.variation('foo', 'default')).toEqual('default');
    });
  });

  describe('variationDetail', () => {
    const reason = { kind: 'FALLTHROUGH' };
    it('returns details for an existing flag - from bootstrap', async () => {
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: makeBootstrap({ foo: { value: 'bar', version: 1, variation: 2, reason: reason } }),
      });
      await client.waitForInitialization();

      expect(client.variationDetail('foo')).toEqual({ value: 'bar', variationIndex: 2, reason: reason });
    });

    it('returns details for an existing flag - from bootstrap with old format', async () => {
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: { foo: 'bar' },
      });
      await client.waitForInitialization();

      expect(client.variationDetail('foo')).toEqual({ value: 'bar', variationIndex: null, reason: null });
    });

    it('returns details for an existing flag - from polling', async () => {
      const pollData = { foo: { value: 'bar', version: 1, variation: 2, reason: reason } };
      server.respondWith(jsonResponse(pollData));

      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      expect(client.variationDetail('foo', 'default')).toEqual({ value: 'bar', variationIndex: 2, reason: reason });
    });

    it('returns default value for flag that had null value', async () => {
      server.respondWith(jsonResponse({ foo: { value: null, version: 1 } }));

      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      expect(client.variationDetail('foo', 'default')).toEqual({
        value: 'default',
        variationIndex: null,
        reason: null,
      });
    });

    it('returns default value and error for unknown flag', async () => {
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      expect(client.variationDetail('foo', 'default')).toEqual({
        value: 'default',
        variationIndex: null,
        reason: { kind: 'ERROR', errorKind: 'FLAG_NOT_FOUND' },
      });
    });
  });

  describe('allFlags', () => {
    it('returns flag values', async () => {
      const initData = makeBootstrap({ key1: { value: 'value1' }, key2: { value: 'value2' } });
      const client = platform.testing.makeClient(envName, user, { bootstrap: initData });
      await client.waitForInitialization();

      expect(client.allFlags()).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('returns empty map if client is not initialized', () => {
      const client = platform.testing.makeClient(envName, user);
      expect(client.allFlags()).toEqual({});
    });
  });

  describe('identify', () => {
    it('updates flag values when the user changes', async () => {
      const user2 = { key: 'user2' };
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      server.respondWith(jsonResponse({ 'enable-foo': { value: true } }));

      await client.identify(user2);
      expect(client.variation('enable-foo')).toEqual(true);
    });

    it('yields map of flag values as the result of identify()', async () => {
      const user2 = { key: 'user2' };
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      server.respondWith(jsonResponse({ 'enable-foo': { value: true } }));

      const flagMap = await client.identify(user2);
      expect(flagMap).toEqual({ 'enable-foo': true });
    });

    it('returns an error when identify is called with null user', async () => {
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      await expect(client.identify(null)).rejects.toThrow();
    });

    it('returns an error when identify is called with user with no key', async () => {
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      await expect(client.identify({ country: 'US' })).rejects.toThrow();
    });

    it('does not change flag values after identify is called with null user', async () => {
      const initData = { foo: 'bar' };
      const client = platform.testing.makeClient(envName, user, { bootstrap: initData });
      await client.waitForInitialization();

      expect(client.variation('foo', 'x')).toEqual('bar');

      await expect(client.identify(null)).rejects.toThrow();

      expect(client.variation('foo', 'x')).toEqual('bar');
    });

    it('does not change flag values after identify is called with invalid user', async () => {
      const initData = { foo: 'bar' };
      const client = platform.testing.makeClient(envName, user, { bootstrap: initData });
      await client.waitForInitialization();

      expect(client.variation('foo', 'x')).toEqual('bar');

      await expect(client.identify({ country: 'US' })).rejects.toThrow();

      expect(client.variation('foo', 'x')).toEqual('bar');
    });

    it('provides a persistent key for an anonymous user with no key', async () => {
      const initData = { foo: 'bar' };
      const client = platform.testing.makeClient(envName, user, { bootstrap: initData });
      await client.waitForInitialization();

      const anonUser = { anonymous: true, country: 'US' };
      await client.identify(anonUser);

      const newUser = client.getUser();
      expect(newUser.key).toEqual(expect.anything());
      expect(newUser).toMatchObject(anonUser);
    });
  });

  describe('initializing with stateProvider', () => {
    it('immediately uses initial state if available, and does not make an HTTP request', async () => {
      const user = { key: 'user' };
      const state = {
        environment: 'env',
        user: user,
        flags: { flagkey: { value: 'value' } },
      };
      const sp = stubPlatform.mockStateProvider(state);

      const client = platform.testing.makeClient(null, null, { stateProvider: sp });
      await client.waitForInitialization();

      expect(client.variation('flagkey')).toEqual('value');
      expect(server.requests.length).toEqual(0);
    });

    it('defers initialization if initial state not available, and does not make an HTTP request', () => {
      const sp = stubPlatform.mockStateProvider(null);

      platform.testing.makeClient(null, null, { stateProvider: sp });
      expect(server.requests.length).toEqual(0);
    });

    it('finishes initialization on receiving init event', async () => {
      const user = { key: 'user' };
      const state = {
        environment: 'env',
        user: user,
        flags: { flagkey: { value: 'value' } },
      };
      const sp = stubPlatform.mockStateProvider(null);

      const client = platform.testing.makeClient(null, null, { stateProvider: sp });

      sp.emit('init', state);

      await client.waitForInitialization();
      expect(client.variation('flagkey')).toEqual('value');
    });

    it('updates flags on receiving update event', async () => {
      const user = { key: 'user' };
      const state0 = {
        environment: 'env',
        user: user,
        flags: { flagkey: { value: 'value0' } },
      };
      const sp = stubPlatform.mockStateProvider(state0);

      const client = platform.testing.makeClient(null, null, { stateProvider: sp });
      await client.waitForInitialization();

      expect(client.variation('flagkey')).toEqual('value0');

      const state1 = {
        flags: { flagkey: { value: 'value1' } },
      };

      const gotChange = promiseListener();
      client.on('change:flagkey', gotChange.callback);

      sp.emit('update', state1);

      const args = await gotChange;
      expect(args).toEqual(['value1', 'value0']);
    });

    it('disables identify()', async () => {
      const user = { key: 'user' };
      const user1 = { key: 'user1' };
      const state = { environment: 'env', user: user, flags: { flagkey: { value: 'value' } } };
      const sp = stubPlatform.mockStateProvider(state);

      const client = platform.testing.makeClient(null, null, { stateProvider: sp });

      sp.emit('init', state);

      await client.waitForInitialization();
      const newFlags = await client.identify(user1);

      expect(newFlags).toEqual({ flagkey: 'value' });
      expect(server.requests.length).toEqual(0);
      expect(platform.testing.logger.output.warn).toEqual([messages.identifyDisabled()]);
    });

    it('copies data from state provider to avoid unintentional object-sharing', async () => {
      const user = { key: 'user' };
      const state = {
        environment: 'env',
        user: user,
        flags: { flagkey: { value: 'value' } },
      };
      const sp = stubPlatform.mockStateProvider(null);

      const client = platform.testing.makeClient(null, null, { stateProvider: sp });

      sp.emit('init', state);

      await client.waitForInitialization();
      expect(client.variation('flagkey')).toEqual('value');

      state.flags.flagkey = { value: 'secondValue' };
      expect(client.variation('flagkey')).toEqual('value');

      sp.emit('update', state);
      expect(client.variation('flagkey')).toEqual('secondValue');

      state.flags.flagkey = { value: 'thirdValue' };
      expect(client.variation('flagkey')).toEqual('secondValue');
    });
  });

  describe('close()', () => {
    it('flushes events', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {}, flushInterval: 100000 });
      await client.waitForInitialization();

      await client.close();

      expect(server.requests.length).toEqual(1);
      const data = JSON.parse(server.requests[0].requestBody);
      expect(data.length).toEqual(1);
      expect(data[0].kind).toEqual('identify');
    });

    it('does nothing if called twice', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {}, flushInterval: 100000 });
      await client.waitForInitialization();

      await client.close();

      expect(server.requests.length).toEqual(1);

      await client.close();

      expect(server.requests.length).toEqual(1);
    });

    it('is not rejected if flush fails', async () => {
      server.respondWith(errorResponse(401));
      const client = platform.testing.makeClient(envName, user, { bootstrap: {}, flushInterval: 100000 });
      await client.waitForInitialization();

      await client.close(); // shouldn't throw or have an unhandled rejection
    });

    it('can take a callback instead of returning a promise', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {}, flushInterval: 100000 });
      await client.waitForInitialization();

      await asyncify(cb => client.close(cb));

      expect(server.requests.length).toEqual(1);
    });
  });
});
