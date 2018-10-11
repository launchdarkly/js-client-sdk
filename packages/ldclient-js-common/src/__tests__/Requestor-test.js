import sinon from 'sinon';
import Requestor from '../Requestor';
import * as utils from '../utils';

describe('Requestor', () => {
  const defaultConfig = { baseUrl: 'http://requestee' };
  const env = 'FAKE_ENV';
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

    const requestor = Requestor(defaultConfig, 'FAKE_ENV');
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
    const requestor = Requestor(config, env);

    requestor.fetchFlagSettings({ key: 'user1' }, 'hash1', sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].method).toEqual('GET');
  });

  it('should make requests with the REPORT verb with a payload if useReport is enabled', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true });
    const user = { key: 'user1' };
    const requestor = Requestor(config, env);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].method).toEqual('REPORT');
    expect(server.requests[0].requestBody).toEqual(JSON.stringify(user));
  });

  it('should include environment and user in GET URL', () => {
    const user = { key: 'user' };
    const requestor = Requestor(defaultConfig, env);

    requestor.fetchFlagSettings(user, null, sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual('http://requestee/sdk/evalx/FAKE_ENV/users/eyJrZXkiOiJ1c2VyIn0');
  });

  it('should include environment, user, and hash in GET URL', () => {
    const user = { key: 'user' };
    const requestor = Requestor(defaultConfig, env);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual('http://requestee/sdk/evalx/FAKE_ENV/users/eyJrZXkiOiJ1c2VyIn0?h=hash1');
  });

  it('should include environment, user, and withReasons in GET URL', () => {
    const config = Object.assign({}, defaultConfig, { evaluationReasons: true });
    const user = { key: 'user' };
    const requestor = Requestor(config, env);

    requestor.fetchFlagSettings(user, null, sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(
      'http://requestee/sdk/evalx/FAKE_ENV/users/eyJrZXkiOiJ1c2VyIn0?withReasons=true'
    );
  });

  it('should include environment, user, hash, and withReasons in GET URL', () => {
    const config = Object.assign({}, defaultConfig, { evaluationReasons: true });
    const user = { key: 'user' };
    const requestor = Requestor(config, env);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual(
      'http://requestee/sdk/evalx/FAKE_ENV/users/eyJrZXkiOiJ1c2VyIn0?h=hash1&withReasons=true'
    );
  });

  it('should include environment in REPORT URL', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true });
    const user = { key: 'user' };
    const requestor = Requestor(config, env);

    requestor.fetchFlagSettings(user, null, sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual('http://requestee/sdk/evalx/FAKE_ENV/user');
  });

  it('should include environment and hash in REPORT URL', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true });
    const user = { key: 'user' };
    const requestor = Requestor(config, env);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual('http://requestee/sdk/evalx/FAKE_ENV/user?h=hash1');
  });

  it('should include environment and withReasons in REPORT URL', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true, evaluationReasons: true });
    const user = { key: 'user' };
    const requestor = Requestor(config, env);

    requestor.fetchFlagSettings(user, null, sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual('http://requestee/sdk/evalx/FAKE_ENV/user?withReasons=true');
  });

  it('should include environment, hash, and withReasons in REPORT URL', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true, evaluationReasons: true });
    const user = { key: 'user' };
    const requestor = Requestor(config, env);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toEqual('http://requestee/sdk/evalx/FAKE_ENV/user?h=hash1&withReasons=true');
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

    const requestor = Requestor(defaultConfig, env);
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
    const requestor = Requestor(config, env);
    const user = { key: 'foo' };
    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests.length).toEqual(1);
    expect(server.requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toEqual(utils.getLDUserAgentString());
  });

  it('should send custom user-agent header in REPORT mode when sendLDHeaders is true', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true, sendLDHeaders: true });
    const requestor = Requestor(config, env);
    const user = { key: 'foo' };
    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests.length).toEqual(1);
    expect(server.requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toEqual(utils.getLDUserAgentString());
  });

  it('should NOT send custom user-agent header when sendLDHeaders is false', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true, sendLDHeaders: false });
    const requestor = Requestor(config, env);
    const user = { key: 'foo' };

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests.length).toEqual(1);
    expect(server.requests[0].requestHeaders['X-LaunchDarkly-User-Agent']).toEqual(undefined);
  });
});
