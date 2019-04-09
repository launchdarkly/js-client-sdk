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

  it('stores flags', async () => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);

    const flags = { flagKey: { value: 'x' } };

    await store.saveFlags(flags);

    const value = platform.testing.getLocalStorageImmediately(lsKey);
    const expected = Object.assign({ $schema: 1 }, flags);
    expect(JSON.parse(value)).toEqual(expected);
  });

  it('retrieves and parses flags', async () => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);

    const expected = { flagKey: { value: 'x' } };
    const stored = Object.assign({ $schema: 1 }, expected);
    platform.testing.setLocalStorageImmediately(lsKey, JSON.stringify(stored));

    const values = await store.loadFlags();
    expect(values).toEqual(expected);
  });

  it('converts flags from old format if schema property is missing', async () => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);

    const oldFlags = { flagKey: 'x' };
    const newFlags = { flagKey: { value: 'x', version: 0 } };
    platform.testing.setLocalStorageImmediately(lsKey, JSON.stringify(oldFlags));

    const values = await store.loadFlags();
    expect(values).toEqual(newFlags);
  });

  it('returns null if storage is empty', async () => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);

    const values = await store.loadFlags();
    expect(values).toBe(null);
  });

  it('clears storage and returns null if value is not valid JSON', async () => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);

    platform.testing.setLocalStorageImmediately(lsKey, '{bad');

    await expect(store.loadFlags()).rejects.toThrow();

    expect(platform.testing.getLocalStorageImmediately(lsKey)).toBe(undefined);
  });

  it('uses hash, if present, instead of user properties', async () => {
    const platform = stubPlatform.defaults();
    const hash = '12345';
    const keyWithHash = 'ld:' + env + ':' + hash;
    const store = Store(platform.localStorage, env, hash, ident, platform.testing.logger);

    const flags = { flagKey: { value: 'x' } };
    await store.saveFlags(flags);

    const value = platform.testing.getLocalStorageImmediately(keyWithHash);
    expect(JSON.parse(value)).toEqual(Object.assign({ $schema: 1 }, flags));
  });

  it('should handle localStorage.get returning an error', async () => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);
    const myError = new Error('localstorage getitem error');
    jest.spyOn(platform.localStorage, 'get').mockImplementation(() => Promise.reject(myError));

    await expect(store.loadFlags()).rejects.toThrow(myError);
    expect(platform.testing.logger.output.warn).toEqual([messages.localStorageUnavailable()]);
  });

  it('should handle localStorage.set returning an error', async () => {
    const platform = stubPlatform.defaults();
    const store = Store(platform.localStorage, env, '', ident, platform.testing.logger);
    const myError = new Error('localstorage setitem error');
    jest.spyOn(platform.localStorage, 'set').mockImplementation(() => Promise.reject(myError));

    await expect(store.saveFlags({ foo: {} })).rejects.toThrow(myError);
    expect(platform.testing.logger.output.warn).toEqual([messages.localStorageUnavailable()]);
  });
});
