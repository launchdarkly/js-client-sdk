import * as stubPlatform from './stubPlatform';
import * as messages from '../messages';
import Identity from '../Identity';
import Store from '../Store';

describe('Store', () => {
  const platform = stubPlatform.defaults();
  const ident = Identity(null);

  it('should handle localStorage getItem throwing an exception', () => {
    const store = Store(platform, 'env', 'hash', ident);
    const getItemSpy = jest.spyOn(platform.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('localstorage getitem error');
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    store.loadFlags();
    expect(consoleWarnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());

    consoleWarnSpy.mockRestore();
    getItemSpy.mockRestore();
  });

  it('should handle localStorage setItem throwing an exception', () => {
    const store = Store(platform, 'env', 'hash', ident);
    const setItemSpy = jest.spyOn(platform.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('localstorage getitem error');
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    store.saveFlags({ foo: {} });
    expect(consoleWarnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());

    consoleWarnSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});
