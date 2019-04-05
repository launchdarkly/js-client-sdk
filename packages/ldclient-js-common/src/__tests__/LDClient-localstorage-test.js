import * as stubPlatform from './stubPlatform';
import { asyncSleep, errorResponse, jsonResponse, makeDefaultServer } from './testUtils';
import * as messages from '../messages';
import * as utils from '../utils';

describe('LDClient local storage', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  const lsKey = 'ld:' + envName + ':' + utils.btoa(JSON.stringify(user));
  let server;

  beforeEach(() => {
    server = makeDefaultServer();
  });

  afterEach(() => {
    server.restore();
  });

  describe('bootstrapping from local storage', () => {
    it('does not try to use local storage if the platform says it is unavailable', () => {
      const platform = stubPlatform.defaults();
      platform.localStorage = null;

      platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      // should see a flag request to the server right away, as if bootstrap was not specified
      expect(server.requests.length).toEqual(1);

      expect(platform.testing.logger.output.warn).toEqual([messages.localStorageUnavailable()]);
    });

    it('uses cached flags if available and requests flags from server after ready', async () => {
      const platform = stubPlatform.defaults();
      const json = '{"flag-key": 1}';
      platform.testing.setLocalStorageImmediately(lsKey, json);

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });
      await client.waitForInitialization();

      expect(client.variation('flag-key')).toEqual(1);
      expect(server.requests.length).toEqual(1);
    });

    it('starts with empty flags and requests them from server if there are no cached flags', async () => {
      const platform = stubPlatform.defaults();
      server.respondWith(jsonResponse({ 'flag-key': { value: 1 } }));

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      // don't wait for ready event - verifying that variation() doesn't throw an error if called before ready
      expect(client.variation('flag-key', 0)).toEqual(0);

      // verify that the flags get requested from LD
      await client.waitForInitialization();
      expect(client.variation('flag-key')).toEqual(1);
    });

    it('should handle localStorage.get returning an error', async () => {
      const platform = stubPlatform.defaults();
      platform.localStorage.get = (_, callback) => {
        utils.onNextTick(() => callback(new Error()));
      };
      server.respondWith(jsonResponse({ 'enable-foo': { value: true } }));

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });
      await client.waitForInitialization();

      expect(platform.testing.logger.output.warn).toEqual([messages.localStorageUnavailable()]);
    });

    it('should handle localStorage.set returning an error', async () => {
      const platform = stubPlatform.defaults();
      platform.localStorage.set = (_1, _2, callback) => {
        utils.onNextTick(() => callback(new Error()));
      };
      server.respondWith(jsonResponse({ 'enable-foo': { value: true } }));

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });
      await client.waitForInitialization();

      await asyncSleep(0); // allow any pending async tasks to complete

      expect(platform.testing.logger.output.warn).toEqual([messages.localStorageUnavailable()]);
    });

    it('should not update cached settings if there was an error fetching flags', async () => {
      const platform = stubPlatform.defaults();
      const json = '{"enable-foo": true}';
      server.respondWith(errorResponse(503));
      platform.testing.setLocalStorageImmediately(lsKey, json);

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });
      await client.waitForInitialization();

      await asyncSleep(0); // allow any pending async tasks to complete

      const value = platform.testing.getLocalStorageImmediately(lsKey);
      expect(value).toEqual(json);
    });

    it('should use hash as localStorage key when secure mode is enabled', async () => {
      const platform = stubPlatform.defaults();
      server.respondWith(jsonResponse({ 'enable-foo': { value: true } }));
      const lsKeyHash = 'ld:UNKNOWN_ENVIRONMENT_ID:totallyLegitHash';
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: 'localstorage',
        hash: 'totallyLegitHash',
        fetchGoals: false,
      });

      await client.waitForInitialization();
      const value = platform.testing.getLocalStorageImmediately(lsKeyHash);
      expect(JSON.parse(value)).toEqual({
        $schema: 1,
        'enable-foo': { value: true },
      });
    });

    it('should clear localStorage when user context is changed', async () => {
      const platform = stubPlatform.defaults();
      const lsKey2 = 'ld:UNKNOWN_ENVIRONMENT_ID:' + utils.btoa('{"key":"user2"}');

      const user2 = { key: 'user2' };
      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      server.respondWith(jsonResponse({ 'enable-foo': { value: true } }));

      await client.waitForInitialization();

      await asyncSleep(0); // allow any pending async tasks to complete

      await client.identify(user2);

      const value1 = platform.testing.getLocalStorageImmediately(lsKey);
      expect(value1).not.toEqual(expect.anything());
      const value2 = platform.testing.getLocalStorageImmediately(lsKey2);
      expect(JSON.parse(value2)).toEqual({
        $schema: 1,
        'enable-foo': { value: true },
      });
    });
  });
});
