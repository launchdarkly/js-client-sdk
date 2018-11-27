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
    it('supports REPORT mode', () => {
      expect(platform.eventSourceAllowsReport).toBe(true);
    });
  });
});
