import browserPlatform from '../browserPlatform';

describe('browserPlatform', () => {
  const platform = browserPlatform();

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
});
