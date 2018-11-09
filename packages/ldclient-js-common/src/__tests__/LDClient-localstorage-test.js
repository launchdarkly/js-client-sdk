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
    // Because the local storage operations make it hard to know how many levels of async deferral
    // will be involved in the client initialization, we'll use sinon's autoRespond mode rather
    // than trying to predict exactly when we should send the response.
    server.autoRespond = true;
    server.autoRespondAfter = 0;
  }

  describe('bootstrapping from local storage', () => {
    it('should clear cached settings if they are invalid JSON', done => {
      localStorageProvider.set(lsKey, 'foo{bar}', () => {
        setupFlagsResponse({ 'enable-foo': { value: true } });

        console.log('*** aasdfasdf');
        const client = stubPlatform.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

        client.on('ready', () => {
          console.log('*** bbbb');
          utils.onNextTick(() => {
            localStorageProvider.get(lsKey, (err, value) => {
              console.log('>>> ' + JSON.stringify(value));
              expect(value).not.toEqual(expect.anything());
            });
            done();
          });
        });
      });
    });

    it('should not clear cached settings if they are valid JSON', done => {
      const json = '{"enable-thing": true}';

      localStorageProvider.set(lsKey, json, () => {
        const client = stubPlatform.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

        client
          .waitForInitialization()
          .then(() => {
            localStorageProvider.get(lsKey, (err, value) => {
              expect(value).toEqual(json);
              done();
            });
          })
          .catch(() => {});
        // The client should not make an HTTP request in this case
      });
    });

    it('should start with empty flags if we tried to use cached settings and there are none', done => {
      setupFlagsResponse({ 'flag-key': { value: 1 } });

      const client = stubPlatform.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      // don't wait for ready event - verifying that variation() doesn't throw an error if called before ready
      expect(client.variation('flag-key', 0)).toEqual(0);

      // verify that the flags get requested from LD
      client.on('ready', () => {
        expect(client.variation('flag-key')).toEqual(1);
        done();
      });
    });

    it('should handle localStorage.get returning an error', done => {
      const platform1 = Object.assign({}, stubPlatform.defaults());
      platform1.localStorage.get = (_, callback) => {
        utils.onNextTick(() => callback(new Error()));
      };
      setupFlagsResponse({ 'enable-foo': { value: true } });

      const client = LDClient.initialize(envName, user, { bootstrap: 'localstorage', fetchGoals: false }, platform1)
        .client;

      client.on('ready', () => {
        expect(warnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());
        done();
      });
    });

    it('should handle localStorage.set returning an error', done => {
      const platform1 = Object.assign({}, stubPlatform.defaults());
      platform1.localStorage.set = (_1, _2, callback) => {
        utils.onNextTick(() => callback(new Error()));
      };
      setupFlagsResponse({ 'enable-foo': { value: true } });

      const client = LDClient.initialize(envName, user, { bootstrap: 'localstorage', fetchGoals: false }, platform1)
        .client;

      client.on('ready', () => {
        utils.onNextTick(() => {
          expect(warnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());
          done();
        });
      });
    });

    it('should not update cached settings if there was an error fetching flags', done => {
      const json = '{"enable-foo": true}';
      server.respondWith([503, {}, '']);

      localStorageProvider.set(lsKey, json, () => {
        const client = stubPlatform.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

        client.on('ready', () => {
          server.respond();
          utils.onNextTick(() => {
            localStorageProvider.get(lsKey, (err, value) => {
              expect(value).toEqual(json);
              done();
            });
          });
        });
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
        localStorageProvider.get(lsKeyHash, (err, value) => {
          expect(JSON.parse(value)).toEqual({
            $schema: 1,
            'enable-foo': { value: true },
          });
          done();
        });
      });
    });

    it('should clear localStorage when user context is changed', done => {
      const lsKey2 = 'ld:UNKNOWN_ENVIRONMENT_ID:' + utils.btoa('{"key":"user2"}');

      const user2 = { key: 'user2' };
      const client = stubPlatform.makeClient(envName, user, { bootstrap: 'localstorage', fetchGoals: false });

      setupFlagsResponse({ 'enable-foo': { value: true } });

      client.on('ready', () => {
        utils.onNextTick(() => {
          client.identify(user2, null, () => {
            localStorageProvider.get(lsKey, (err, value) => {
              expect(value).not.toEqual(expect.anything());
              localStorageProvider.get(lsKey2, (err, value) => {
                expect(JSON.parse(value)).toEqual({
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
  });
});
