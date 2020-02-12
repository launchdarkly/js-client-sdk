import sinon from 'sinon';

import * as common from 'launchdarkly-js-sdk-common';
import * as LDClient from '../index';
import * as pkg from '../../package.json';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  let warnSpy;
  let errorSpy;
  let server;

  beforeEach(() => {
    server = sinon.createFakeServer();
    server.autoRespond = true;
    server.autoRespondAfter = 0;
    server.respondWith([200, { 'Content-Type': 'application/json' }, '{}']); // default 200 response for tests that don't specify otherwise

    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    server.restore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should exist', () => {
    expect(LDClient).toBeDefined();
  });

  it('should return current version', () => {
    expect(LDClient.version).toEqual(pkg.version);
  });

  describe('initialization', () => {
    it('should trigger the ready event', async () => {
      const client = LDClient.initialize(envName, user, { bootstrap: {}, sendEvents: false });
      await client.waitForInitialization();
    });

    it('should not fetch flag settings if bootstrap is provided, but should still fetch goals', async () => {
      const client = LDClient.initialize(envName, user, { bootstrap: {}, sendEvents: false });
      await client.waitForInitialization();
      expect(server.requests.length).toEqual(1);
      expect(server.requests[0].url).toMatch(/sdk\/goals/);
    });

    it('sends correct User-Agent in request', async () => {
      const client = LDClient.initialize(envName, user, { fetchGoals: false, sendEvents: false });
      await client.waitForInitialization();

      expect(server.requests.length).toEqual(1);
      expect(server.requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toMatch(/^JSClient\//);
    });
  });

  describe('identify', () => {
    describe('Disables synchronous XHR if page did not unload', () => {
      async function setupClient() {
        const config = { bootstrap: {}, flushInterval: 100000, fetchGoals: false, sendEvents: false };
        const client = LDClient.initialize(envName, user, config);
        await client.waitForInitialization();
        return client;
      }
      function testWithUserAgent(desc, ua) {
        it('in ' + desc, async () => {
          window.navigator.__defineGetter__('userAgent', () => ua);

          const client = await setupClient();
          expect(server.requests.length).toEqual(0);
          window.dispatchEvent(new window.Event('beforeunload'));
          await client.identify({ key: 'new-user' });
          expect(server.requests.length).toEqual(1);
          expect(server.requests[0].async).toBe(true);
        });
      }

      testWithUserAgent(
        'Chrome 72',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
      );

      testWithUserAgent('unknown browser', 'Special Kitty Cat Browser');

      testWithUserAgent('empty user-agent', null);
    });
  });

  describe('goals', () => {
    it('fetches goals if fetchGoals is unspecified', async () => {
      const client = LDClient.initialize(envName, user, { sendEvents: false });
      await client.waitForInitialization();
      expect(server.requests.length).toEqual(2);
      // The following line uses arrayContaining because we can't be sure whether the goals request will
      // be made before or after the flags request.
      expect(server.requests).toEqual(
        expect.arrayContaining([expect.objectContaining({ url: expect.stringMatching(/sdk\/goals/) })])
      );
    });

    it('fetches goals if fetchGoals is true', async () => {
      const client = LDClient.initialize(envName, user, { fetchGoals: true, sendEvents: false });
      await client.waitForInitialization();
      expect(server.requests.length).toEqual(2);
      expect(server.requests).toEqual(
        expect.arrayContaining([expect.objectContaining({ url: expect.stringMatching(/sdk\/goals/) })])
      );
    });

    it('does not fetch goals if fetchGoals is false', async () => {
      const client = LDClient.initialize(envName, user, { fetchGoals: false, sendEvents: false });
      await client.waitForInitialization();
      expect(server.requests.length).toEqual(1);
      expect(server.requests[0].url).toMatch(/sdk\/eval/);
    });

    it('should resolve waitUntilGoalsReady when goals are loaded', done => {
      const handleGoalsReady = jest.fn();
      const client = LDClient.initialize(envName, user, { bootstrap: {}, sendEvents: false });

      client.waitUntilGoalsReady().then(handleGoalsReady);

      client.on('goalsReady', () => {
        setTimeout(() => {
          expect(handleGoalsReady).toHaveBeenCalled();
          done();
        }, 0);
      });

      expect(server.requests.length).toEqual(1);
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, '[]');
    });
  });

  describe('track()', () => {
    it('should not warn when tracking a known custom goal event', async () => {
      server.respondWith([200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]']);

      const client = LDClient.initialize(envName, user, { bootstrap: {}, sendEvents: false });
      await client.waitForInitialization();
      await client.waitUntilGoalsReady();

      client.track('known');
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should warn when tracking an unknown custom goal event', async () => {
      server.respondWith([200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]']);

      const client = LDClient.initialize(envName, user, { bootstrap: {}, sendEvents: false });
      await client.waitForInitialization();
      await client.waitUntilGoalsReady();

      client.track('unknown');
      expect(warnSpy).toHaveBeenCalledWith('LD: [warn] ' + common.messages.unknownCustomEventKey('unknown'));
    });
  });

  describe('event flushing', () => {
    it('normally uses asynchronous XHR', async () => {
      const config = { bootstrap: {}, flushInterval: 100000, fetchGoals: false, diagnosticOptOut: true };
      const client = LDClient.initialize(envName, user, config);
      await client.waitForInitialization();

      await client.flush();

      expect(server.requests.length).toEqual(2);
      // ignore first request because it's just a side effect of calling browserPlatform.httpAllowsPost()
      expect(server.requests[1].async).toBe(true);
    });

    async function setupClientAndTriggerUnload() {
      const config = { bootstrap: {}, flushInterval: 100000, fetchGoals: false, diagnosticOptOut: true };
      const client = LDClient.initialize(envName, user, config);
      await client.waitForInitialization();

      window.dispatchEvent(new window.Event('beforeunload'));

      return client;
    }

    describe('uses synchronous XHR during page unload', () => {
      function testWithUserAgent(desc, ua) {
        it('in ' + desc, async () => {
          window.navigator.__defineGetter__('userAgent', () => ua);

          await setupClientAndTriggerUnload();

          expect(server.requests.length).toEqual(2);
          // ignore first request because it's just a side effect of calling browserPlatform.httpAllowsPost()
          expect(server.requests[1].async).toBe(false); // events
        });
      }

      testWithUserAgent(
        'Chrome 72',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
      );

      testWithUserAgent('unknown browser', 'Special Kitty Cat Browser');

      testWithUserAgent('empty user-agent', null);
    });

    describe('Disables synchronous XHR if page did not unload', () => {
      function testWithUserAgent(desc, ua) {
        it('in ' + desc, async () => {
          window.navigator.__defineGetter__('userAgent', () => ua);

          const client = await setupClientAndTriggerUnload();
          expect(server.requests.length).toEqual(2);
          // ignore first request because it's just a side effect of calling browserPlatform.httpAllowsPost()
          expect(server.requests[1].async).toBe(false); // events
          client.track('Test'); // lets track a event that happen after a beforeunload event.
          client.flush().catch(() => {}); // flush that event
          expect(server.requests.length).toEqual(3); // assert the server got the request.
          expect(server.requests[2].async).toBe(true);
        });
      }

      testWithUserAgent(
        'Chrome 72',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
      );

      testWithUserAgent('unknown browser', 'Special Kitty Cat Browser');

      testWithUserAgent('empty user-agent', null);
    });

    describe('discards events during page unload', () => {
      function testWithUserAgent(desc, ua) {
        it('in ' + desc, async () => {
          window.navigator.__defineGetter__('userAgent', () => ua);

          await setupClientAndTriggerUnload();

          window.dispatchEvent(new window.Event('beforeunload'));

          expect(server.requests.length).toEqual(1); // flags query
        });
      }

      testWithUserAgent(
        'Chrome 73',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36'
      );

      testWithUserAgent(
        'Chrome 74',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3683.103 Safari/537.36'
      );
    });
  });
});
