import sinon from 'sinon';

import * as common from 'ldclient-js-common';
import * as LDClient from '../index';

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

  describe('initialization', () => {
    it('should trigger the ready event', async () => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });
      await client.waitForInitialization();
    });

    it('should not fetch flag settings if bootstrap is provided, but should still fetch goals', async () => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });
      await client.waitForInitialization();
      expect(server.requests.length).toEqual(1);
      expect(server.requests[0].url).toMatch(/sdk\/goals/);
    });

    it('sends correct User-Agent in request', async () => {
      const client = LDClient.initialize(envName, user, { fetchGoals: false });
      await client.waitForInitialization();

      expect(server.requests.length).toEqual(1);
      expect(server.requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toMatch(/^JSClient\//);
    });
  });

  describe('goals', () => {
    it('fetches goals if fetchGoals is unspecified', async () => {
      const client = LDClient.initialize(envName, user, {});
      await client.waitForInitialization();
      expect(server.requests.length).toEqual(2);
      // The following line uses arrayContaining because we can't be sure whether the goals request will
      // be made before or after the flags request.
      expect(server.requests).toEqual(
        expect.arrayContaining([expect.objectContaining({ url: expect.stringMatching(/sdk\/goals/) })])
      );
    });

    it('fetches goals if fetchGoals is true', async () => {
      const client = LDClient.initialize(envName, user, { fetchGoals: true });
      await client.waitForInitialization();
      expect(server.requests.length).toEqual(2);
      expect(server.requests).toEqual(
        expect.arrayContaining([expect.objectContaining({ url: expect.stringMatching(/sdk\/goals/) })])
      );
    });

    it('does not fetch goals if fetchGoals is false', async () => {
      const client = LDClient.initialize(envName, user, { fetchGoals: false });
      await client.waitForInitialization();
      expect(server.requests.length).toEqual(1);
      expect(server.requests[0].url).toMatch(/sdk\/eval/);
    });

    it('should resolve waitUntilGoalsReady when goals are loaded', done => {
      const handleGoalsReady = jest.fn();
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

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

      const client = LDClient.initialize(envName, user, { bootstrap: {} });
      await client.waitForInitialization();
      await client.waitUntilGoalsReady();

      client.track('known');
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should warn when tracking an unknown custom goal event', async () => {
      server.respondWith([200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]']);

      const client = LDClient.initialize(envName, user, { bootstrap: {} });
      await client.waitForInitialization();
      await client.waitUntilGoalsReady();

      client.track('unknown');
      expect(warnSpy).toHaveBeenCalledWith(common.messages.unknownCustomEventKey('unknown'));
    });
  });
});
