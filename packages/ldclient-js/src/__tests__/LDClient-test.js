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
      const client = LDClient.initialize(envName, user, {
        bootstrap: {},
      });

      client.on('ready', handleReady);

      setTimeout(() => {
        expect(handleReady).toHaveBeenCalled();
        done();
      }, 0);
    });
  });
});
