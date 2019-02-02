import sinon from 'sinon';

import * as stubPlatform from './stubPlatform';
import * as messages from '../messages';
import * as utils from '../utils';

describe('LDClient local storage', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  const lsKey = 'ld:' + envName + ':' + utils.btoa(JSON.stringify(user));
  let server;

  beforeEach(() => {
    server = sinon.fakeServer.create();
  });

  afterEach(() => {
    server.restore();
  });

  function setupFlagsResponse(flags) {
    server.respondWith([200, { 'Content-Type': 'application/json' }, JSON.stringify(flags)]);
    // Because the local storage operations make it hard to know how many levels of async deferral
    // will be involved in the client initialization, we'll use sinon's autoRespond mode rather
    // than trying to predict exactly when we should send the response.
    server.autoRespond = true;
    server.autoRespondAfter = 0;
  }

  describe('bootstrapping from local storage', () => {
    it('uses cached flags if available and requests flags from server after ready', done => {
      const platform = stubPlatform.defaults();
      const json = '{"flag-key": 1}';
      platform.testing.setLocalStorageImmediately(lsKey, json);

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      client.waitForInitialization().then(() => {
        expect(client.variation('flag-key')).toEqual(1);
        expect(server.requests.length).toEqual(1);
        done();
      });
    });

    it('starts with empty flags and requests them from server if there are no cached flags', done => {
      const platform = stubPlatform.defaults();
      setupFlagsResponse({ 'flag-key': { value: 1 } });

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      // don't wait for ready event - verifying that variation() doesn't throw an error if called before ready
      expect(client.variation('flag-key', 0)).toEqual(0);

      // verify that the flags get requested from LD
      client.waitForInitialization().then(() => {
        expect(client.variation('flag-key')).toEqual(1);
        done();
      });
    });

    it('should handle localStorage.get returning an error', done => {
      const platform = stubPlatform.defaults();
      platform.localStorage.get = (_, callback) => {
        utils.onNextTick(() => callback(new Error()));
      };
      setupFlagsResponse({ 'enable-foo': { value: true } });

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      client.waitForInitialization().then(() => {
        expect(platform.testing.logger.output.warn).toEqual([messages.localStorageUnavailable()]);
        done();
      });
    });

    it('should handle localStorage.set returning an error', done => {
      const platform = stubPlatform.defaults();
      platform.localStorage.set = (_1, _2, callback) => {
        utils.onNextTick(() => callback(new Error()));
      };
      setupFlagsResponse({ 'enable-foo': { value: true } });

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      client.waitForInitialization().then(() => {
        utils.onNextTick(() => {
          expect(platform.testing.logger.output.warn).toEqual([messages.localStorageUnavailable()]);
          done();
        });
      });
    });

    it('should not update cached settings if there was an error fetching flags', done => {
      const platform = stubPlatform.defaults();
      const json = '{"enable-foo": true}';
      server.respondWith([503, {}, '']);
      platform.testing.setLocalStorageImmediately(lsKey, json);

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      client.waitForInitialization().then(() => {
        server.respond();
        utils.onNextTick(() => {
          platform.localStorage.get(lsKey, (err, value) => {
            expect(value).toEqual(json);
            done();
          });
        });
      });
    });

    it('should use hash as localStorage key when secure mode is enabled', done => {
      const platform = stubPlatform.defaults();
      setupFlagsResponse({ 'enable-foo': { value: true } });
      const lsKeyHash = 'ld:UNKNOWN_ENVIRONMENT_ID:totallyLegitHash';
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: 'localstorage',
        hash: 'totallyLegitHash',
        fetchGoals: false,
      });

      client.waitForInitialization().then(() => {
        const value = platform.testing.getLocalStorageImmediately(lsKeyHash);
        expect(JSON.parse(value)).toEqual({
          $schema: 1,
          'enable-foo': { value: true },
        });
        done();
      });
    });

    it('should clear localStorage when user context is changed', done => {
      const platform = stubPlatform.defaults();
      const lsKey2 = 'ld:UNKNOWN_ENVIRONMENT_ID:' + utils.btoa('{"key":"user2"}');

      const user2 = { key: 'user2' };
      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      setupFlagsResponse({ 'enable-foo': { value: true } });

      client.waitForInitialization().then(() => {
        utils.onNextTick(() => {
          client.identify(user2, null, () => {
            const value1 = platform.testing.getLocalStorageImmediately(lsKey);
            expect(value1).not.toEqual(expect.anything());
            const value2 = platform.testing.getLocalStorageImmediately(lsKey2);
            expect(JSON.parse(value2)).toEqual({
              $schema: 1,
              'enable-foo': { value: true },
            });
            done();
          });
        });
      });
    });
  });
});
