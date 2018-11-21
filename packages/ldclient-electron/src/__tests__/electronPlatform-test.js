import electronPlatform from '../electronPlatform';

describe('electronPlatform', () => {
  const platform = electronPlatform();

  describe('getCurrentUrl()', () => {
    it('returns null', () => {
      expect(platform.getCurrentUrl()).toBeNull();
    });
  });

  describe('isDoNotTrack()', () => {
    it('returns false', () => {
      expect(platform.isDoNotTrack()).toEqual(false);
    });
  });
});
