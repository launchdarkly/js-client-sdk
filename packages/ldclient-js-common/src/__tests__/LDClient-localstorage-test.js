import sinon from 'sinon';

import * as stubPlatform from './stubPlatform';
import * as LDClient from '../index';
import * as messages from '../messages';
import * as utils from '../utils';

describe('LDClient local storage', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const lsKey = 'ld:UNKNOWN_ENVIRONMENT_ID:' + utils.btoa('{"key":"user"}');
  const user = { key: 'user' };
  const localStorageProvider = stubPlatform.defaults().localStorage;
  let warnSpy;
  let errorSpy;
  let server;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    stubPlatform.resetLocalStorage();
  });

  afterEach(() => {
    server.restore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  function setupFlagsResponse(flags) {
    server.respondWith([200, { 'Content-Type': 'application/json' }, JSON.stringify(flags)]);
  }

  describe('bootstrapping from local storage', () => {
    it('should clear cached settings if they are invalid JSON', done => {
      localStorageProvider.setItem(lsKey, 'foo{bar}');
      setupFlagsResponse({ 'enable-foo': { value: true } });

      const client = stubPlatform.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      expect(localStorageProvider.getItem(lsKey)).not.toEqual(expect.anything());

      client.on('ready', () => {
        done();
      });

      server.respond();
    });

    it('should not clear cached settings if they are valid JSON', done => {
      const json = '{"enable-thing": true}';

      localStorageProvider.setItem(lsKey, json);

      const client = stubPlatform.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      client
        .waitForInitialization()
        .then(() => {
          expect(localStorageProvider.getItem(lsKey)).toEqual(json);
          done();
        })
        .catch(() => {});
    });

    it('should start with empty flags if we tried to use cached settings and there are none', done => {
      localStorageProvider.removeItem(lsKey);
      setupFlagsResponse({ 'flag-key': { value: 1 } });

      const client = stubPlatform.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      // don't wait for ready event - verifying that variation() doesn't throw an error if called before ready
      expect(client.variation('flag-key', 0)).toEqual(0);

      // verify that the flags get requested from LD
      client.on('ready', () => {
        expect(client.variation('flag-key')).toEqual(1);
        done();
      });

      server.respond();
    });

    it('should handle localStorage getItem throwing an exception', done => {
      const platform1 = Object.assign({}, stubPlatform.defaults());
      platform1.localStorage.getItem = () => {
        throw new Error();
      };
      setupFlagsResponse({ 'enable-foo': { value: true } });

      const client = LDClient.initialize(envName, user, { bootstrap: 'localstorage', fetchGoals: false }, platform1)
        .client;

      client.on('ready', () => {
        expect(warnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());
        done();
      });

      server.respond();
    });

    it('should handle localStorage setItem throwing an exception', done => {
      const platform1 = Object.assign({}, stubPlatform.defaults());
      platform1.localStorage.setItem = () => {
        throw new Error();
      };
      setupFlagsResponse({ 'enable-foo': { value: true } });

      const client = LDClient.initialize(envName, user, { bootstrap: 'localstorage', fetchGoals: false }, platform1)
        .client;

      client.on('ready', () => {
        expect(warnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());
        done();
      });

      server.respond();
    });

    it('should not update cached settings if there was an error fetching flags', done => {
      const json = '{"enable-foo": true}';
      server.respondWith([503, {}, '']);

      localStorageProvider.setItem(lsKey, json);

      const client = stubPlatform.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      client.on('ready', () => {
        server.respond();
        setTimeout(() => {
          expect(localStorageProvider.getItem(lsKey)).toEqual(json);
          done();
        }, 1);
      });
    });

    it('should use hash as localStorage key when secure mode is enabled', done => {
      setupFlagsResponse({ 'enable-foo': { value: true } });
      const lsKeyHash = 'ld:UNKNOWN_ENVIRONMENT_ID:totallyLegitHash';
      const client = stubPlatform.makeClient(envName, user, {
        bootstrap: 'localstorage',
        hash: 'totallyLegitHash',
        fetchGoals: false,
      });

      client.on('ready', () => {
        expect(JSON.parse(localStorageProvider.getItem(lsKeyHash))).toEqual({
          $schema: 1,
          'enable-foo': { value: true },
        });
        done();
      });

      server.respond();
    });

    it('should clear localStorage when user context is changed', done => {
      const lsKey2 = 'ld:UNKNOWN_ENVIRONMENT_ID:' + utils.btoa('{"key":"user2"}');

      const user2 = { key: 'user2' };
      const client = stubPlatform.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      setupFlagsResponse({ 'enable-foo': { value: true } });

      client.on('ready', () => {
        utils.onNextTick(() => {
          client.identify(user2, null, () => {
            expect(localStorageProvider.getItem(lsKey)).not.toEqual(expect.anything());
            expect(JSON.parse(localStorageProvider.getItem(lsKey2))).toEqual({
              $schema: 1,
              'enable-foo': { value: true },
            });
            done();
          });
          server.respond();
        });
      });
      server.respond();
    });
  });
});
