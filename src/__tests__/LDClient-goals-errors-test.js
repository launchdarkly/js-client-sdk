// Client-level coverage of goals fetch failures: the error event / console.error message must carry the
// 'Error fetching goals: ' prefix and waitUntilGoalsReady must still resolve.
import sinon from 'sinon';
import * as common from 'launchdarkly-js-sdk-common';

import * as LDClient from '../index';

describe('LDClient goals fetch failure', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  let server;
  let errorSpy;

  beforeEach(() => {
    server = sinon.createFakeServer();
    server.autoRespond = true;
    server.autoRespondAfter = 0; // nise: falls back to a 10 ms setTimeout -> always async vs initialize()
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    server.restore();
    errorSpy.mockRestore();
  });

  async function initAndCollectErrors(response) {
    server.respondWith('GET', /sdk\/goals/, response);
    // bootstrap: {} => no flags request; sendEvents: false => no events request. Only /sdk/goals is issued.
    const client = LDClient.initialize(envName, user, { bootstrap: {}, sendEvents: false });
    const errors = [];
    client.on('error', (e) => errors.push(e));
    await Promise.race([
      client.waitUntilGoalsReady(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('waitUntilGoalsReady hung')), 1000)),
    ]);
    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].url).toMatch(/\/sdk\/goals\/UNKNOWN_ENVIRONMENT_ID$/);
    return errors;
  }

  const cases = [
    // nise FakeXMLHttpRequest leaves statusText empty, so Requestor.getResponseError falls back to String(status).
    ['HTTP 500', [500, {}, 'oops'], 'Error fetching goals: ' + common.messages.errorFetchingFlags('500')],
    ['HTTP 404', [404, {}, ''], 'Error fetching goals: ' + common.messages.environmentNotFound()],
    [
      '200 text/plain',
      [200, { 'Content-Type': 'text/plain' }, 'hello'],
      'Error fetching goals: ' + common.messages.invalidContentType('text/plain'),
    ],
    [
      '200 application/json with malformed body',
      [200, { 'Content-Type': 'application/json' }, '{not json'],
      /^Error fetching goals: (Unexpected token|Expected property name)/,
    ],
  ];

  describe.each(cases)('%s on /sdk/goals', (label, response, expected) => {
    it('emits exactly one LDUnexpectedResponseError with the "Error fetching goals: " prefix and resolves waitUntilGoalsReady', async () => {
      const errors = await initAndCollectErrors(response);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(common.errors.LDUnexpectedResponseError);
      if (expected instanceof RegExp) {
        expect(errors[0].message).toMatch(expected);
      } else {
        expect(errors[0].message).toBe(expected);
      }
      expect(errorSpy).not.toHaveBeenCalled(); // listener present => emitted, not console.error'd
    });
  });

  it('logs via console.error with the prefix when no error listener is registered (HTTP 500)', async () => {
    server.respondWith('GET', /sdk\/goals/, [500, {}, 'oops']);
    const client = LDClient.initialize(envName, user, { bootstrap: {}, sendEvents: false });
    await client.waitUntilGoalsReady();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    // default logger prefixes '[LaunchDarkly] '
    expect(errorSpy.mock.calls[0][0]).toBe(
      '[LaunchDarkly] Error fetching goals: ' + common.messages.errorFetchingFlags('500')
    );
  });

  it('network error (XHR onerror) is reported with the prefix', async () => {
    server.autoRespond = false;
    const client = LDClient.initialize(envName, user, { bootstrap: {}, sendEvents: false });
    const errors = [];
    client.on('error', (e) => errors.push(e));
    expect(server.requests).toHaveLength(1);
    server.requests[0].error();
    await client.waitUntilGoalsReady();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Error fetching goals: ' + common.messages.networkError(new Error()));
  });
});
