import sinon from 'sinon';

import browserPlatform from '../browserPlatform';

describe('browserPlatform', () => {
  const platform = browserPlatform();
  const lsKeyPrefix = 'launchdarkly-js-client-sdk-test:';

  describe('httpRequest()', () => {
    // These tests verify that our HTTP abstraction is correctly translated into the XMLHttpRequest API,
    // which will be intercepted by Sinon.

    const url = 'http://example';

    let server;

    beforeEach(() => {
      server = sinon.createFakeServer();
    });

    afterEach(() => {
      server.restore();
    });

    it('sets request properties', () => {
      const method = 'POST';
      const headers = { a: '1', b: '2' };
      const body = '{}';
      platform.httpRequest(method, url, headers, body);

      expect(server.requests.length).toEqual(1);
      const req = server.requests[0];

      expect(req.method).toEqual(method);
      expect(req.url).toEqual(url);
      expect(req.requestHeaders['a']).toEqual('1');
      expect(req.requestHeaders['b']).toEqual('2');
      expect(req.requestBody).toEqual(body);
      expect(req.async).toEqual(true);
    });

    it('resolves promise when response is received', async () => {
      const requestInfo = platform.httpRequest('GET', url);

      expect(server.requests.length).toEqual(1);
      const req = server.requests[0];
      req.respond(200, {}, 'hello');

      const result = await requestInfo.promise;
      expect(result.status).toEqual(200);
      expect(result.body).toEqual('hello');
    });

    it('returns headers', async () => {
      const headers = { 'Content-Type': 'text/plain', Date: 'not really a date' };
      const requestInfo = platform.httpRequest('GET', url);

      expect(server.requests.length).toEqual(1);
      const req = server.requests[0];
      req.respond(200, headers, 'hello');

      const result = await requestInfo.promise;
      expect(result.header('content-type')).toEqual(headers['Content-Type']);
      expect(result.header('date')).toEqual(headers['Date']);
    });

    it('rejects promise if request gets a network error', async () => {
      const requestInfo = platform.httpRequest('GET', url);

      expect(server.requests.length).toEqual(1);
      const req = server.requests[0];
      req.error();

      await expect(requestInfo.promise).rejects.toThrow();
    });

    it('allows request to be cancelled', () => {
      const requestInfo = platform.httpRequest('GET', url);

      expect(server.requests.length).toEqual(1);
      expect(server.requests[0].aborted).toBeFalsy();

      requestInfo.cancel();

      expect(server.requests.length).toEqual(1);
      expect(server.requests[0].aborted).toBe(true);
    });
  });

  describe('getCurrentUrl()', () => {
    const expectedUrl = 'https://mydomain.com/some/path'; // this is set in jest.config.js

    it('returns value of window.location.href', () => {
      expect(platform.getCurrentUrl()).toEqual(expectedUrl);
    });

    it('calls URL transformer if specified', () => {
      const p = browserPlatform({ eventUrlTransformer: url => url + '/x' });
      expect(p.getCurrentUrl()).toEqual(expectedUrl + '/x');
    });
  });

  describe('isDoNotTrack()', () => {
    beforeEach(() => {
      window.navigator.doNotTrack = undefined;
      window.navigator.msDoNotTrack = undefined;
      window.doNotTrack = undefined;
    });

    // see: https://dev.to/corbindavenport/how-to-correctly-check-for-do-not-track-with-javascript-135d

    it('returns false by default', () => {
      expect(platform.isDoNotTrack()).toEqual(false);
    });

    it('returns true if window.doNotTrack is 1', () => {
      window.doNotTrack = 1;
      expect(platform.isDoNotTrack()).toEqual(true);
    });

    it('returns true if navigator.doNotTrack is 1', () => {
      window.navigator.doNotTrack = 1;
      expect(platform.isDoNotTrack()).toEqual(true);
    });

    it('returns true if navigator.doNotTrack is "yes"', () => {
      window.navigator.doNotTrack = 'yes';
      expect(platform.isDoNotTrack()).toEqual(true);
    });

    it('returns true if navigator.msDoNotTrack is "1"', () => {
      window.navigator.msDoNotTrack = '1';
      expect(platform.isDoNotTrack()).toEqual(true);
    });
  });

  describe('localStorage', () => {
    // Since we're not currently running these tests in an actual browser, this is really using a
    // mock implementation of window.localStorage, but these tests still verify that our async
    // wrapper code in browserPlatform.js is passing the parameters through correctly.

    it('returns null or undefined for missing value', async () => {
      const value = await platform.localStorage.get(lsKeyPrefix + 'unused-key');
      expect(value).not.toBe(expect.anything());
    });

    it('can get and set value', async () => {
      const key = lsKeyPrefix + 'get-set-key';
      await platform.localStorage.set(key, 'hello');
      const value = await platform.localStorage.get(key);
      expect(value).toEqual('hello');
    });

    it('can delete value', async () => {
      const key = lsKeyPrefix + 'delete-key';
      await platform.localStorage.set(key, 'hello');
      await platform.localStorage.clear(key);
      const value = platform.localStorage.get(key);
      expect(value).not.toBe(expect.anything());
    });

    it('reports local storage as being unavailable if window.localStorage is missing', () => {
      const oldLocalStorage = window.localStorage;
      try {
        delete window.localStorage;
        const testPlatform = browserPlatform();
        expect(testPlatform.localStorage).not.toBe(expect.anything());
      } finally {
        window.localStorage = oldLocalStorage;
      }
    });

    it('reports local storage as being unavailable if accessing window.localStorage throws an exception', () => {
      const oldLocalStorage = window.localStorage;
      try {
        delete window.localStorage;
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get: () => {
            throw new Error('should not see this error');
          },
        });
        const testPlatform = browserPlatform();
        expect(testPlatform.localStorage).not.toBe(expect.anything());
      } finally {
        delete window.localStorage;
        window.localStorage = oldLocalStorage;
      }
    });
  });

  describe('EventSource', () => {
    let oldWindowEventSource;
    let oldWindowPolyfill;

    const browser = {};
    const polyfill = {};
    const browserConstructor = () => browser;
    const polyfillConstructor = () => polyfill;
    const reportPolyfillConstructor = () => polyfill;

    beforeAll(() => {
      oldWindowEventSource = window.EventSource;
      oldWindowPolyfill = window.EventSourcePolyfill;
      reportPolyfillConstructor.supportedOptions = { method: true };
    });

    afterAll(() => {
      window.EventSource = oldWindowEventSource;
      window.EventSourcePolyfill = oldWindowPolyfill;
    });

    beforeEach(() => {
      window.EventSource = browserConstructor;
      delete window.EventSourcePolyfill;
    });

    it('does not support REPORT mode without polyfill', () => {
      const testPlatform = browserPlatform({ useReport: true });
      expect(testPlatform.eventSourceAllowsReport).toBe(false);
    });

    it('does not support REPORT mode with unsupported polyfill', () => {
      window.EventSourcePolyfill = polyfillConstructor;
      const testPlatform = browserPlatform({ useReport: true });
      expect(testPlatform.eventSourceAllowsReport).toBe(false);
    });

    it('supports REPORT mode with supported polyfill', () => {
      window.EventSourcePolyfill = reportPolyfillConstructor;
      const testPlatform = browserPlatform({ useReport: true });
      expect(testPlatform.eventSourceAllowsReport).toBe(true);
    });

    it('uses browser implementation when useReport is false', () => {
      window.EventSourcePolyfill = reportPolyfillConstructor;
      const testPlatform = browserPlatform();
      expect(testPlatform.eventSourceFactory('URL')).toBe(browser);
    });

    it('uses browser implementation when method is unsupported by polyfill', () => {
      window.EventSourcePolyfill = polyfillConstructor;
      const testPlatform = browserPlatform({ useReport: true });
      expect(testPlatform.eventSourceFactory('URL')).toBe(browser);
    });

    it('uses polyfill when method supported and useReport is true', () => {
      window.EventSourcePolyfill = reportPolyfillConstructor;
      const testPlatform = browserPlatform({ useReport: true });
      expect(testPlatform.eventSourceFactory('URL')).toBe(polyfill);
    });

    it('does not provide stream factory when EventSource unsupported', () => {
      delete window.EventSource;
      const testPlatform = browserPlatform();
      expect(testPlatform.eventSourceFactory).toBe(undefined);
    });

    it('factory includes provided options in polyfill constructor', () => {
      window.EventSourcePolyfill = (url, options) => ({ url: url, options: options });
      window.EventSourcePolyfill.supportedOptions = { method: true };
      const testPlatform = browserPlatform({ useReport: true });
      const res = testPlatform.eventSourceFactory('URL', { method: 'REPORT' });
      expect(res['url']).toEqual('URL');
      expect(res['options']).toEqual(expect.objectContaining({ method: 'REPORT' }));
    });

    it('factory sets common polyfill timeouts', () => {
      window.EventSourcePolyfill = (url, options) => ({ url: url, options: options });
      window.EventSourcePolyfill.supportedOptions = { method: true };
      const testPlatform = browserPlatform({ useReport: true });
      const res = testPlatform.eventSourceFactory('URL');
      expect(res['url']).toEqual('URL');
      expect(res['options']).toEqual(
        expect.objectContaining({ heartbeatTimeout: expect.any(Number), silentTimeout: expect.any(Number) })
      );
    });
  });
});
