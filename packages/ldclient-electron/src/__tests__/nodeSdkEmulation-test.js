import sinon from 'sinon';

import * as LDClient from '../index';

// These tests verify that the methods provided by nodeSdkEmulation.js behave the way a user of
// the Node SDK would expect them to behave.

describe('Node-style API wrapper', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  const otherUser = { key: 'other' };
  const flags = { flag: { value: 'a', variation: 1 } };
  const flagsBootstrap = { flag: 'a', $flagsState: { flag: { variation: 1 } } };
  const flagKey = 'flag';
  const flagValue = 'a';
  let xhr;
  let requests = [];
  let warnSpy;

  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(req) {
      requests.push(req);
    };
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    requests = [];
    xhr.restore();
    warnSpy.mockRestore();
  });

  function respondWithFlags() {
    setImmediate(() => {
      expect(requests.length).toEqual(1);
      requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify(flags));
    });
  }

  function respondWithError() {
    setImmediate(() => {
      expect(requests.length).toEqual(1);
      requests[0].respond(401);
    });
  }

  function createWrappedClient(options) {
    const client = LDClient.initializeInMain(envName, user, Object.assign({}, options, { mockHttp: true }));
    return LDClient.createNodeSdkAdapter(client);
  }

  function asyncTestWithIdentify(testFn) {
    function doTest(changeUser, bootstrap, done) {
      const wrappedClient = createWrappedClient({ bootstrap: bootstrap });
      wrappedClient.waitForInitialization().then(() => {
        testFn(wrappedClient, changeUser ? otherUser : user, done);
        if (changeUser) {
          respondWithFlags();
        }
      });
    }

    it('when user is not changed', done => {
      doTest(false, flagsBootstrap, done);
    });

    it('when user is changed', done => {
      doTest(true, {}, done);
    });
  }

  it('supports initialized()', done => {
    const wrappedClient = createWrappedClient();

    expect(wrappedClient.initialized()).toBe(false);

    wrappedClient.waitForInitialization().then(() => {
      expect(wrappedClient.initialized()).toBe(true);
      done();
    });

    respondWithFlags();
  });

  describe('waitUntilReady()', () => {
    it('resolves on success', done => {
      const wrappedClient = createWrappedClient();
      wrappedClient.waitUntilReady().then(done);
      respondWithFlags();
    });

    it('resolves on failure', done => {
      const wrappedClient = createWrappedClient();
      wrappedClient.waitUntilReady().then(done);
      respondWithError();
    });
  });

  describe('waitForInitialization()', () => {
    it('resolves on success', done => {
      const wrappedClient = createWrappedClient();
      wrappedClient.waitForInitialization().then(result => {
        expect(result).toBe(wrappedClient);
        done();
      });
      respondWithFlags();
    });

    it('rejects on failure', done => {
      const wrappedClient = createWrappedClient();
      wrappedClient.waitForInitialization().catch(() => done());
      respondWithError();
    });
  });

  describe('variation()', () => {
    asyncTestWithIdentify((wrappedClient, user, done) => {
      wrappedClient.variation(flagKey, user, 'default', (err, value) => {
        expect(err).not.toBe(expect.anything());
        expect(value).toEqual(flagValue);
        done();
      });
    });
  });

  describe('variationDetail()', () => {
    asyncTestWithIdentify((wrappedClient, user, done) => {
      wrappedClient.variationDetail(flagKey, user, 'default', (err, value) => {
        expect(err).not.toBe(expect.anything());
        expect(value).toEqual({ value: flagValue, variationIndex: 1, reason: null });
        done();
      });
    });
  });

  describe('allFlags()', () => {
    asyncTestWithIdentify((wrappedClient, user, done) => {
      wrappedClient.allFlags(user, (err, flags) => {
        expect(err).not.toBe(expect.anything());
        expect(flags).toEqual({ flag: flagValue });
        done();
      });
    });
  });

  describe('allFlagsState()', () => {
    asyncTestWithIdentify((wrappedClient, user, done) => {
      wrappedClient.allFlagsState(user, (err, state) => {
        expect(err).not.toBe(expect.anything());
        expect(state).toEqual({
          $valid: true,
          flag: flagValue,
          $flagsState: {
            flag: {
              variation: 1,
            },
          },
        });
        done();
      });
    });
  });

  describe('supports track()', () => {
    asyncTestWithIdentify((wrappedClient, user, done) => {
      wrappedClient.track('my-event-key', user).then(() => {
        wrappedClient.flush();

        const lastRequest = requests[requests.length - 1];
        expect(lastRequest.url).toMatch(/https:\/\/events\.launchdarkly\.com/);
        expect(lastRequest.requestBody).toMatch(/my-event-key/);

        done();
      });
    });
  });

  describe('identify()', () => {
    it('makes a flags request when switching users', done => {
      const wrappedClient = createWrappedClient({ bootstrap: {} });

      wrappedClient.waitForInitialization().then(() => {
        wrappedClient.identify(otherUser);

        setImmediate(() => {
          expect(requests.length).toEqual(1);
          done();
        });
      });
    });

    it('calls identify() even if user is unchanged', done => {
      // The behavior we're testing here is that the wrapper always calls the underlying identify() method,
      // because the contract for identify() is that it always generates an identify event. In the future, the
      // client will be changed so that if you call identify() with the same user, it sends an event but does
      // not re-request the flags.
      const wrappedClient = createWrappedClient({ bootstrap: {} });

      wrappedClient.waitForInitialization().then(() => {
        wrappedClient.identify(user);

        setImmediate(() => {
          expect(requests.length).toEqual(1);
          done();
        });
      });
    });
  });

  it('returns empty string from secureModeHash() and logs a warning', done => {
    const wrappedClient = createWrappedClient({ bootstrap: {} });

    wrappedClient.waitForInitialization().then(() => {
      const hash = wrappedClient.secureModeHash(user);
      expect(hash).toEqual('');
      expect(warnSpy).toHaveBeenCalled();
      done();
    });
  });

  it('supports on()', done => {
    const wrappedClient = createWrappedClient({ bootstrap: {} });
    wrappedClient.on('ready', () => done());
  });

  it('supports off()', done => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    const wrappedClient = createWrappedClient();
    wrappedClient.on('ready', listener1);
    wrappedClient.on('ready', listener2);
    wrappedClient.off('ready', listener1);

    wrappedClient.waitForInitialization().then(() => {
      expect(listener2).toHaveBeenCalled();
      expect(listener1).not.toHaveBeenCalled();

      done();
    });

    respondWithFlags();
  });
});
