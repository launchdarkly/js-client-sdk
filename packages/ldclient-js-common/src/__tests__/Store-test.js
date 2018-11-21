import * as stubPlatform from './stubPlatform';
import * as messages from '../messages';
import Identity from '../Identity';
import Store from '../Store';

describe('Store', () => {
  const ident = Identity(null);

  let platform;
  let warnSpy;

  beforeEach(() => {
    platform = stubPlatform.defaults();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should handle localStorage.get returning an error', done => {
    const store = Store(platform.localStorage, 'env', 'hash', ident);
    const myError = new Error('localstorage getitem error');
    jest.spyOn(platform.localStorage, 'get').mockImplementation((key, callback) => {
      callback(myError);
    });

    store.loadFlags(err => {
      expect(err).toEqual(myError);
      expect(warnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());
      done();
    });
  });

  it('should handle localStorage.set returning an error', done => {
    const store = Store(platform.localStorage, 'env', 'hash', ident);
    const myError = new Error('localstorage setitem error');
    jest.spyOn(platform.localStorage, 'set').mockImplementation((key, value, callback) => {
      callback(myError);
    });

    store.saveFlags({ foo: {} }, err => {
      expect(err).toEqual(myError);
      expect(warnSpy).toHaveBeenCalledWith(messages.localStorageUnavailable());
      done();
    });
  });
});
