import browserPlatform from '../browserPlatform';

describe('browserPlatform', () => {
  const platform = browserPlatform();
  const lsKeyPrefix = 'ldclient-js-test:';

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
  });

  describe('EventSource', () => {
    it('does not support REPORT mode', () => {
      expect(platform.eventSourceAllowsReport).toBe(false);
    });
  });
});
