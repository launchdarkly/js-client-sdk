import * as stubPlatform from './stubPlatform';
import { errorResponse, jsonResponse, makeDefaultServer } from './testUtils';
import Requestor from '../Requestor';
import * as errors from '../errors';
import * as messages from '../messages';
import * as utils from '../utils';

describe('Requestor', () => {
  const baseUrl = 'http://requestee';
  const defaultConfig = { baseUrl: baseUrl };
  const user = { key: 'foo' };
  const encodedUser = 'eyJrZXkiOiJmb28ifQ';
  const env = 'FAKE_ENV';
  const platform = stubPlatform.defaults();
  const logger = stubPlatform.logger();
  let server;

  beforeEach(() => {
    server = makeDefaultServer();
  });

  afterEach(() => {
    server.restore();
  });

  it('resolves on success', async () => {
    const requestor = Requestor(platform, defaultConfig, 'FAKE_ENV', logger);
    await requestor.fetchFlagSettings({ key: 'user1' }, 'hash1');
    await requestor.fetchFlagSettings({ key: 'user2' }, 'hash2');

    expect(server.requests).toHaveLength(2);
  });

  it('makes requests with the GET verb if useReport is disabled', async () => {
    const config = Object.assign({}, defaultConfig, { useReport: false });
    const requestor = Requestor(platform, config, env, logger);

    await requestor.fetchFlagSettings(user, 'hash1');

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].method).toEqual('GET');
  });

  it('makes requests with the REPORT verb with a payload if useReport is enabled', async () => {
    const config = Object.assign({}, defaultConfig, { useReport: true });
    const requestor = Requestor(platform, config, env, logger);

    await requestor.fetchFlagSettings(user, 'hash1');

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].method).toEqual('REPORT');
    expect(server.requests[0].requestBody).toEqual(JSON.stringify(user));
  });

  it('includes environment and user in GET URL', async () => {
    const requestor = Requestor(platform, defaultConfig, env, logger);

    await requestor.fetchFlagSettings(user, null);

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/users/${encodedUser}`);
  });

  it('includes environment, user, and hash in GET URL', async () => {
    const requestor = Requestor(platform, defaultConfig, env, logger);

    await requestor.fetchFlagSettings(user, 'hash1');

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/users/${encodedUser}?h=hash1`);
  });

  it('includes environment, user, and withReasons in GET URL', async () => {
    const config = Object.assign({}, defaultConfig, { evaluationReasons: true });
    const requestor = Requestor(platform, config, env, logger);

    await requestor.fetchFlagSettings(user, null);

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/users/${encodedUser}?withReasons=true`);
  });

  it('includes environment, user, hash, and withReasons in GET URL', async () => {
    const config = Object.assign({}, defaultConfig, { evaluationReasons: true });
    const requestor = Requestor(platform, config, env, logger);

    await requestor.fetchFlagSettings(user, 'hash1');

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/users/${encodedUser}?h=hash1&withReasons=true`);
  });

  it('includes environment in REPORT URL', async () => {
    const config = Object.assign({}, defaultConfig, { useReport: true });
    const requestor = Requestor(platform, config, env, logger);

    await requestor.fetchFlagSettings(user, null);

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/user`);
  });

  it('includes environment and hash in REPORT URL', async () => {
    const config = Object.assign({}, defaultConfig, { useReport: true });
    const requestor = Requestor(platform, config, env, logger);

    await requestor.fetchFlagSettings(user, 'hash1');

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/user?h=hash1`);
  });

  it('includes environment and withReasons in REPORT URL', async () => {
    const config = Object.assign({}, defaultConfig, { useReport: true, evaluationReasons: true });
    const requestor = Requestor(platform, config, env, logger);

    await requestor.fetchFlagSettings(user, null);

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/user?withReasons=true`);
  });

  it('includes environment, hash, and withReasons in REPORT URL', async () => {
    const config = Object.assign({}, defaultConfig, { useReport: true, evaluationReasons: true });
    const requestor = Requestor(platform, config, env, logger);

    await requestor.fetchFlagSettings(user, 'hash1');

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/user?h=hash1&withReasons=true`);
  });

  it('sends custom user-agent header in GET mode when sendLDHeaders is true', async () => {
    const config = Object.assign({}, defaultConfig, { sendLDHeaders: true });
    const requestor = Requestor(platform, config, env, logger);
    await requestor.fetchFlagSettings(user, 'hash1');

    expect(server.requests.length).toEqual(1);
    expect(server.requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toEqual(
      utils.getLDUserAgentString(platform)
    );
  });

  it('sends custom user-agent header in REPORT mode when sendLDHeaders is true', async () => {
    const config = Object.assign({}, defaultConfig, { useReport: true, sendLDHeaders: true });
    const requestor = Requestor(platform, config, env, logger);
    await requestor.fetchFlagSettings(user, 'hash1');

    expect(server.requests.length).toEqual(1);
    expect(server.requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toEqual(
      utils.getLDUserAgentString(platform)
    );
  });

  it('does NOT send custom user-agent header when sendLDHeaders is false', async () => {
    const config = Object.assign({}, defaultConfig, { useReport: true, sendLDHeaders: false });
    const requestor = Requestor(platform, config, env, logger);

    await requestor.fetchFlagSettings(user, 'hash1');

    expect(server.requests.length).toEqual(1);
    expect(server.requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toEqual(undefined);
  });

  it('returns parsed JSON response on success', async () => {
    const requestor = Requestor(platform, defaultConfig, env, logger);

    const data = { foo: 'bar' };
    server.respondWith(jsonResponse(data));

    const result = await requestor.fetchFlagSettings(user);
    expect(result).toEqual(data);
  });

  it('signals specific error for 404 response', async () => {
    const requestor = Requestor(platform, defaultConfig, env, logger);

    server.respondWith(errorResponse(404));

    const err = new errors.LDInvalidEnvironmentIdError(messages.environmentNotFound());
    await expect(requestor.fetchFlagSettings(user)).rejects.toThrow(err);
  });

  it('signals general error for non-404 error status', async () => {
    const requestor = Requestor(platform, defaultConfig, env, logger);

    server.respondWith(errorResponse(500));

    const err = new errors.LDFlagFetchError(messages.errorFetchingFlags('500'));
    await expect(requestor.fetchFlagSettings(user)).rejects.toThrow(err);
  });

  it('signals general error for network error', async () => {
    const requestor = Requestor(platform, defaultConfig, env, logger);

    server.respondWith(req => req.error());

    const err = new errors.LDFlagFetchError(messages.networkError());
    await expect(requestor.fetchFlagSettings(user)).rejects.toThrow(err);
  });

  it('coalesces multiple requests so all callers get the latest result', async () => {
    const requestor = Requestor(platform, defaultConfig, env, logger);

    let n = 0;
    server.autoRespond = false;
    server.respondWith(req => {
      n++;
      req.respond(...jsonResponse({ value: n }));
    });

    const r1 = requestor.fetchFlagSettings(user);
    const r2 = requestor.fetchFlagSettings(user);

    server.respond();
    server.respond();
    // Note that we should only get a single response, { value: 1 } - Sinon does not call our respondWith
    // function for the first request, because it's already been cancelled by the time the server looks
    // at the request queue. The important thing is just that both requests get the same value.

    const result1 = await r1;
    const result2 = await r2;

    expect(result1).toEqual({ value: n });
    expect(result2).toEqual({ value: n });
  });

  describe('When HTTP requests are not available at all', () => {
    it('fails on fetchFlagSettings', async () => {
      const requestor = Requestor(stubPlatform.withoutHttp(), defaultConfig, env, logger);
      await expect(requestor.fetchFlagSettings(user, null)).rejects.toThrow(messages.httpUnavailable());
    });
  });
});
