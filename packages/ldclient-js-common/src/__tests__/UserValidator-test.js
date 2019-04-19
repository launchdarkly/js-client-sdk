import UserValidator from '../UserValidator';

describe('UserValidator', () => {
  let localStorage;
  let logger;
  let uv;

  beforeEach(() => {
    localStorage = {};
    logger = {
      warn: jest.fn(),
    };
    uv = UserValidator(localStorage, logger);
  });

  it('rejects null user', async () => {
    await expect(uv.validateUser(null)).rejects.toThrow();
  });

  it('leaves user with string key unchanged', async () => {
    const u = { key: 'someone', name: 'me' };
    expect(await uv.validateUser(u)).toEqual(u);
  });

  it('stringifies non-string key', async () => {
    const u0 = { key: 123, name: 'me' };
    const u1 = { key: '123', name: 'me' };
    expect(await uv.validateUser(u0)).toEqual(u1);
  });

  it('uses cached key for anonymous user', async () => {
    const cachedKey = 'thing';
    let storageKey;
    localStorage.get = async key => {
      storageKey = key;
      return cachedKey;
    };
    const u = { anonymous: true };
    expect(await uv.validateUser(u)).toEqual({ key: cachedKey, anonymous: true });
    expect(storageKey).toEqual('ld:$anonUserId');
  });

  it('generates and stores key for anonymous user', async () => {
    let storageKey;
    let storedValue;
    localStorage.get = async () => null;
    localStorage.set = async (key, value) => {
      storageKey = key;
      storedValue = value;
    };
    const u0 = { anonymous: true };
    const u1 = await uv.validateUser(u0);
    expect(storedValue).toEqual(expect.anything());
    expect(u1).toEqual({ key: storedValue, anonymous: true });
    expect(storageKey).toEqual('ld:$anonUserId');
  });
});
