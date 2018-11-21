import electronPlatform from '../electronPlatform';

describe('electronPlatform', () => {
  const platform = electronPlatform();
  const lsKeyPrefix = 'ldclient-electron-test:';

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

  describe('local storage', () => {
    it('returns null for missing value', done => {
      platform.localStorage.get(lsKeyPrefix + 'unused-key', (err, value) => {
        expect(err).toBe(null);
        expect(value).toBe(null);
        done();
      });
    });

    it('can get and set value', done => {
      const key = lsKeyPrefix + 'get-set-key';
      platform.localStorage.set(key, 'hello', err => {
        expect(err).toBe(null);
        platform.localStorage.get(key, (err, value) => {
          expect(err).toBe(null);
          expect(value).toEqual('hello');
          done();
        });
      })
    });

    it('can delete value', done => {
      const key = lsKeyPrefix + 'delete-key';
      platform.localStorage.set(key, 'hello', err => {
        expect(err).toBe(null);
        platform.localStorage.clear(key, err => {
          expect(err).toBe(null);
          platform.localStorage.get(key, (err, value) => {
            expect(err).toBe(null);
            expect(value).toBe(null);
            done();
          });
        });
      });
    });
  });
});
