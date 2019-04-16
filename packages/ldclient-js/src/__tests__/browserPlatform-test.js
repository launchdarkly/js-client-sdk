import browserPlatform from '../browserPlatform';

describe('browserPlatform', () => {
  const platform = browserPlatform();
  const lsKeyPrefix = 'ldclient-js-test:';

  describe('httpAllowsSync()', () => {
    function setUserAgent(s) {
      window.navigator.__defineGetter__('userAgent', () => s);
    }

    it('returns true for Chrome 72', () => {
      setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36'
      );
      expect(platform.httpAllowsSync()).toBe(true);
    });

    it('returns false for Chrome 73', () => {
      setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36'
      );
      expect(platform.httpAllowsSync()).toBe(false);
    });

    it('returns false for Chrome 74', () => {
      setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3683.103 Safari/537.36'
      );
      expect(platform.httpAllowsSync()).toBe(false);
    });

    it('returns true for unknown browser', () => {
      setUserAgent('Special Kitty Cat Browser');
      expect(platform.httpAllowsSync()).toBe(true);
    });

    it('returns true if userAgent is missing', () => {
      setUserAgent(null);
      expect(platform.httpAllowsSync()).toBe(true);
    });
  });

  describe('getCurrentUrl()', () => {
    it('returns value of window.location.href', () => {
      expect(platform.getCurrentUrl()).toEqual(window.location.href);
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

    it('returns null or undefined for missing value', done => {
      platform.localStorage.get(lsKeyPrefix + 'unused-key', (err, value) => {
        expect(err).not.toBe(expect.anything());
        expect(value).not.toBe(expect.anything());
        done();
      });
    });

    it('can get and set value', done => {
      const key = lsKeyPrefix + 'get-set-key';
      platform.localStorage.set(key, 'hello', err => {
        expect(err).not.toBe(expect.anything());
        platform.localStorage.get(key, (err, value) => {
          expect(err).not.toBe(expect.anything());
          expect(value).toEqual('hello');
          done();
        });
      });
    });

    it('can delete value', done => {
      const key = lsKeyPrefix + 'delete-key';
      platform.localStorage.set(key, 'hello', err => {
        expect(err).not.toBe(expect.anything());
        platform.localStorage.clear(key, err => {
          expect(err).not.toBe(expect.anything());
          platform.localStorage.get(key, (err, value) => {
            expect(err).not.toBe(expect.anything());
            expect(value).not.toBe(expect.anything());
            done();
          });
        });
      });
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
    it('does not support REPORT mode', () => {
      expect(platform.eventSourceAllowsReport).toBe(false);
    });
  });
});
