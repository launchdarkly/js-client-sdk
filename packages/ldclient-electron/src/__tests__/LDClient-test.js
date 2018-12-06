import sinon from 'sinon';

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
      const client = LDClient.initializeInMain(envName, user, { bootstrap: {}, mockHttp: true, sendEvents: false });

      client.on('ready', handleReady);

      setTimeout(() => {
        expect(handleReady).toHaveBeenCalled();
        done();
      }, 0);
    });

    it('sends correct User-Agent in request', done => {
      LDClient.initializeInMain(envName, user, { mockHttp: true });

      setTimeout(() => {
        expect(requests.length).toEqual(1);
        expect(requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toMatch(/^ElectronClient\//);
        done();
      }, 0);
    });
  });

  describe('track()', () => {
    it('should not warn when tracking an arbitrary custom event', done => {
      const client = LDClient.initializeInMain(envName, user, {
        bootstrap: {},
        mockHttp: true,
        sendEvents: false,
        logger: LDClient.createConsoleLogger('warn'),
      });

      client.on('ready', () => {
        client.track('whatever');
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        done();
      });
    });
  });
});
