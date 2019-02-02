import sinon from 'sinon';
import * as stubPlatform from './stubPlatform';
import Requestor from '../Requestor';
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
  let seq = 0;

  beforeEach(() => {
    server = sinon.fakeServer.create();
  });

  afterEach(() => {
    server.restore();
  });

  it('should always call the callback', () => {
    const handleOne = sinon.spy();
    const handleTwo = sinon.spy();

    const requestor = Requestor(platform, defaultConfig, 'FAKE_ENV', logger);
    requestor.fetchFlagSettings({ key: 'user1' }, 'hash1', handleOne);
    requestor.fetchFlagSettings({ key: 'user2' }, 'hash2', handleTwo);

    server.respondWith(req => {
      seq++;
      req.respond(200, { 'Content-type': 'application/json' }, JSON.stringify({ tag: seq }));
    });

    server.respond();

    expect(server.requests).toHaveLength(2);
    expect(handleOne.args[0]).toEqual(handleTwo.args[0]);
  });

  it('should make requests with the GET verb if useReport is disabled', () => {
    const config = Object.assign({}, defaultConfig, { useReport: false });
    const requestor = Requestor(platform, config, env, logger);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].method).toEqual('GET');
  });

  it('should make requests with the REPORT verb with a payload if useReport is enabled', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true });
    const requestor = Requestor(platform, config, env, logger);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].method).toEqual('REPORT');
    expect(server.requests[0].requestBody).toEqual(JSON.stringify(user));
  });

  it('should include environment and user in GET URL', () => {
    const requestor = Requestor(platform, defaultConfig, env, logger);

    requestor.fetchFlagSettings(user, null, sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/users/${encodedUser}`);
  });

  it('should include environment, user, and hash in GET URL', () => {
    const requestor = Requestor(platform, defaultConfig, env, logger);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/users/${encodedUser}?h=hash1`);
  });

  it('should include environment, user, and withReasons in GET URL', () => {
    const config = Object.assign({}, defaultConfig, { evaluationReasons: true });
    const requestor = Requestor(platform, config, env, logger);

    requestor.fetchFlagSettings(user, null, sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/users/${encodedUser}?withReasons=true`);
  });

  it('should include environment, user, hash, and withReasons in GET URL', () => {
    const config = Object.assign({}, defaultConfig, { evaluationReasons: true });
    const requestor = Requestor(platform, config, env, logger);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/users/${encodedUser}?h=hash1&withReasons=true`);
  });

  it('should include environment in REPORT URL', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true });
    const requestor = Requestor(platform, config, env, logger);

    requestor.fetchFlagSettings(user, null, sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/user`);
  });

  it('should include environment and hash in REPORT URL', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true });
    const requestor = Requestor(platform, config, env, logger);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/user?h=hash1`);
  });

  it('should include environment and withReasons in REPORT URL', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true, evaluationReasons: true });
    const requestor = Requestor(platform, config, env, logger);

    requestor.fetchFlagSettings(user, null, sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/user?withReasons=true`);
  });

  it('should include environment, hash, and withReasons in REPORT URL', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true, evaluationReasons: true });
    const requestor = Requestor(platform, config, env, logger);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(`${baseUrl}/sdk/evalx/${env}/user?h=hash1&withReasons=true`);
  });

  it('should call the each callback at most once', () => {
    const handleOne = sinon.spy();
    const handleTwo = sinon.spy();
    const handleThree = sinon.spy();
    const handleFour = sinon.spy();
    const handleFive = sinon.spy();

    server.respondWith(req => {
      seq++;
      req.respond(200, { 'Content-type': 'application/json' }, JSON.stringify({ tag: seq }));
    });

    const requestor = Requestor(platform, defaultConfig, env, logger);
    requestor.fetchFlagSettings({ key: 'user1' }, 'hash1', handleOne);
    server.respond();
    requestor.fetchFlagSettings({ key: 'user2' }, 'hash2', handleTwo);
    server.respond();
    requestor.fetchFlagSettings({ key: 'user3' }, 'hash3', handleThree);
    server.respond();
    requestor.fetchFlagSettings({ key: 'user4' }, 'hash4', handleFour);
    server.respond();
    requestor.fetchFlagSettings({ key: 'user5' }, 'hash5', handleFive);
    server.respond();

    expect(server.requests).toHaveLength(5);
    expect(handleOne.calledOnce).toEqual(true);
    expect(handleTwo.calledOnce).toEqual(true);
    expect(handleThree.calledOnce).toEqual(true);
    expect(handleFour.calledOnce).toEqual(true);
    expect(handleFive.calledOnce).toEqual(true);
  });

  it('should send custom user-agent header in GET mode when sendLDHeaders is true', () => {
    const config = Object.assign({}, defaultConfig, { sendLDHeaders: true });
    const requestor = Requestor(platform, config, env, logger);
    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests.length).toEqual(1);
    expect(server.requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toEqual(
      utils.getLDUserAgentString(platform)
    );
  });

  it('should send custom user-agent header in REPORT mode when sendLDHeaders is true', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true, sendLDHeaders: true });
    const requestor = Requestor(platform, config, env, logger);
    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests.length).toEqual(1);
    expect(server.requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toEqual(
      utils.getLDUserAgentString(platform)
    );
  });

  it('should NOT send custom user-agent header when sendLDHeaders is false', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true, sendLDHeaders: false });
    const requestor = Requestor(platform, config, env, logger);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests.length).toEqual(1);
    expect(server.requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toEqual(undefined);
  });

  describe('When HTTP requests are not available at all', () => {
    it('should fail on fetchFlagSettings', done => {
      const requestor = Requestor(stubPlatform.withoutHttp(), defaultConfig, env, logger);
      requestor.fetchFlagSettings(user, null, err => {
        expect(err.message).toEqual(messages.httpUnavailable());
        done();
      });
    });
  });
});
