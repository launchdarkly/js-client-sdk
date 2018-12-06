import sinon from 'sinon';

import * as common from 'ldclient-js-common';
import * as LDClient from '../index';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  let warnSpy;
  let errorSpy;
  let xhr;
  let requests = [];

  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(req) {
      requests.push(req);
    };

    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    requests = [];
    xhr.restore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should exist', () => {
    expect(LDClient).toBeDefined();
  });

  describe('initialization', () => {
    it('should trigger the ready event', done => {
      const handleReady = jest.fn();
      const client = LDClient.initialize(envName, user, {
        bootstrap: {},
      });

      client.on('ready', handleReady);

      setTimeout(() => {
        expect(handleReady).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should not fetch flag settings if bootstrap is provided, but should still fetch goals', () => {
      LDClient.initialize(envName, user, { bootstrap: {} });
      expect(requests.length).toEqual(1);
      expect(/sdk\/eval/.test(requests[0].url)).toEqual(false); // it's the goals request
    });

    it('sends correct User-Agent in request', done => {
      LDClient.initialize(envName, user, { fetchGoals: false });

      setTimeout(() => {
        expect(requests.length).toEqual(1);
        expect(requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toMatch(/^JSClient\//);
        done();
      }, 0);
    });
  });

  describe('goals', () => {
    it('fetches goals if fetchGoals is unspecified', () => {
      LDClient.initialize(envName, user, {});
      expect(requests.length).toEqual(2);
      expect(/sdk\/goals/.test(requests[1].url)).toEqual(true);
    });

    it('fetches goals if fetchGoals is true', () => {
      LDClient.initialize(envName, user, { fetchGoals: true });
      expect(requests.length).toEqual(2);
      expect(/sdk\/goals/.test(requests[1].url)).toEqual(true);
    });

    it('does not fetch goals if fetchGoals is false', () => {
      LDClient.initialize(envName, user, { fetchGoals: false });
      expect(requests.length).toEqual(1);
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

      expect(requests.length).toEqual(1);
      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[]');
    });
  });

  describe('track()', () => {
    it('should not warn when tracking a known custom goal event', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.track('known');
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        done();
      });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]');
    });

    it('should warn when tracking an unknown custom goal event', done => {
      const client = LDClient.initialize(envName, user, { bootstrap: {} });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]');

      client.on('ready', () => {
        client.track('unknown');
        expect(warnSpy).toHaveBeenCalledWith(common.messages.unknownCustomEventKey('unknown'));
        done();
      });
    });
  });
});
