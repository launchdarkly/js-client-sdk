import Identity from '../Identity';
import Store from '../Store';
import * as messages from '../messages';

describe('Store', () => {
  const ident = Identity(null);

  it('should handle localStorage getItem throwing an exception', () => {
    const store = Store('env', 'hash', ident);
    const getItemSpy = jest.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('localstorage getitem error');
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    store.loadFlags();
    expect(consoleWarnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());

    consoleWarnSpy.mockRestore();
    getItemSpy.mockRestore();
  });

  it('should handle localStorage setItem throwing an exception', () => {
    const store = Store('env', 'hash', ident);
    const setItemSpy = jest.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('localstorage getitem error');
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    store.saveFlags({ foo: {} });
    expect(consoleWarnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());

    consoleWarnSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});
