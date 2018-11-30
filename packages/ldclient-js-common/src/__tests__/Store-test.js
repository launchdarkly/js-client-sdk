import * as stubPlatform from './stubPlatform';
import * as messages from '../messages';
import Identity from '../Identity';
import Store from '../Store';
import * as utils from '../utils';

describe('Store', () => {
  const user = { key: 'user' };
  const ident = Identity(user);
  const env = 'ENVIRONMENT';
  const lsKey = 'ld:' + env + ':' + utils.btoa(JSON.stringify(user));

  it('stores flags', done => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);

    const flags = { flagKey: { value: 'x' } };

    store.saveFlags(flags, err => {
      expect(err).toBe(null);
      const value = platform.testing.getLocalStorageImmediately(lsKey);
      const expected = Object.assign({ $schema: 1 }, flags);
      expect(JSON.parse(value)).toEqual(expected);
      done();
    });
  });

  it('retrieves and parses flags', done => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);

    const expected = { flagKey: { value: 'x' } };
    const stored = Object.assign({ $schema: 1 }, expected);
    platform.testing.setLocalStorageImmediately(lsKey, JSON.stringify(stored));

    store.loadFlags((err, values) => {
      expect(err).toBe(null);
      expect(values).toEqual(expected);
      done();
    });
  });

  it('converts flags from old format if schema property is missing', done => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);

    const oldFlags = { flagKey: 'x' };
    const newFlags = { flagKey: { value: 'x', version: 0 } };
    platform.testing.setLocalStorageImmediately(lsKey, JSON.stringify(oldFlags));

    store.loadFlags((err, values) => {
      expect(err).toBe(null);
      expect(values).toEqual(newFlags);
      done();
    });
  });

  it('returns null if storage is empty', done => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);

    store.loadFlags((err, values) => {
      expect(err).toBe(null);
      expect(values).toBe(null);
      done();
    });
  });

  it('clears storage and returns null if value is not valid JSON', done => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);

    platform.testing.setLocalStorageImmediately(lsKey, '{bad');

    store.loadFlags((err, values) => {
      expect(err).not.toBe(null);
      expect(values).toBe(null);
      expect(platform.testing.getLocalStorageImmediately(lsKey)).toBe(undefined);
      done();
    });
  });

  it('uses hash, if present, instead of user properties', done => {
    const platform = stubPlatform.defaults();
    const hash = '12345';
    const keyWithHash = 'ld:' + env + ':' + hash;
    const store = Store(platform.localStorage, env, hash, ident, platform.testing.logger);

    const flags = { flagKey: { value: 'x' } };
    store.saveFlags(flags, err => {
      expect(err).toBe(null);
      const value = platform.testing.getLocalStorageImmediately(keyWithHash);
      expect(JSON.parse(value)).toEqual(Object.assign({ $schema: 1 }, flags));
      done();
    });
  });

  it('should handle localStorage.get returning an error', done => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);
    const myError = new Error('localstorage getitem error');
    jest.spyOn(platform.localStorage, 'get').mockImplementation((key, callback) => {
      callback(myError);
    });

    store.loadFlags(err => {
      expect(err).toEqual(myError);
      expect(platform.testing.logger.output.warn).toEqual([messages.localStorageUnavailable()]);
      done();
    });
  });

  it('should handle localStorage.set returning an error', done => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);
    const myError = new Error('localstorage setitem error');
    jest.spyOn(platform.localStorage, 'set').mockImplementation((key, value, callback) => {
      callback(myError);
    });

    store.saveFlags({ foo: {} }, err => {
      expect(err).toEqual(myError);
      expect(platform.testing.logger.output.warn).toEqual([messages.localStorageUnavailable()]);
      done();
    });
  });
});
