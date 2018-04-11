import store from '../store';
import * as messages from '../messages';

describe('store', () => {
  it('should handle localStorage getItem throwing an exception', () => {
    const getItemSpy = jest.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('localstorage getitem error');
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    store.get('foo');
    expect(consoleWarnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());

    consoleWarnSpy.mockRestore();
    getItemSpy.mockRestore();
  });

  it('should handle localStorage setItem throwing an exception', () => {
    const setItemSpy = jest.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('localstorage getitem error');
    });

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    store.set('foo', 'bar');
    expect(consoleWarnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());

    consoleWarnSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});
