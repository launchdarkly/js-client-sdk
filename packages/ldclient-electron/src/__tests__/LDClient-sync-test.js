import sinon from 'sinon';

import * as LDClient from '../index';

// These tests cover the mechanisms by which the main-process client and renderer-process clients are
// kept in sync. However, in the current test framework it's not possible to actually create any
// renderer processes, so the tests are just verifying that particular methods that are used in the
// synchronization logic behave correctly.

describe('interprocess sync', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  const flagValue = 'flagValue';
  const flags = {
    flagKey: { value: flagValue, version: 1, variation: 1 },
  };
  const bootstrap = {
    flagKey: flagValue,
    $flagsState: {
      flagKey: { version: 1, variation: 1 },
    },
  };
  const expectedState = { environment: envName, user: user, flags: flags };

  let xhr;

  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest();
  });

  afterEach(() => {
    xhr.restore();
  });

  describe('getInternalClientState', () => {
    it('returns null if no main client exists yet', () => {
      expect(LDClient.getInternalClientState(envName)).toBe(null);
    });

    it('returns null if a client exists but is not ready yet', () => {
      LDClient.initializeInMain(envName, user, { mockHttp: true });
      expect(LDClient.getInternalClientState(envName)).toBe(null);
    });

    it('returns state if client is ready', done => {
      const client = LDClient.initializeInMain(envName, user, { bootstrap: bootstrap, mockHttp: true });
      client.waitForInitialization().then(() => {
        expect(LDClient.getInternalClientState(envName)).toEqual(expectedState);
        done();
      });
    });

    it('if environment is unspecified and there is only one client, uses that one', done => {
      const client = LDClient.initializeInMain(envName, user, { bootstrap: bootstrap, mockHttp: true });
      client.waitForInitialization().then(() => {
        expect(LDClient.getInternalClientState()).toEqual(expectedState);
        done();
      });
    });

    it('if environment is unspecified and there are multiple clients, returns null', done => {
      const client1 = LDClient.initializeInMain(envName, user, { bootstrap: {}, mockHttp: true });
      const client2 = LDClient.initializeInMain(envName + '2', user, { bootstrap: bootstrap, mockHttp: true });
      client1.waitForInitialization().then(() => {
        client2.waitForInitialization().then(() => {
          expect(LDClient.getInternalClientState()).toBe(null);
          done();
        });
      });
    });
  });
});
