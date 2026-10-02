// Covers the goals-fetch .catch path: every failure must be reported as an LDUnexpectedResponseError
// whose message carries the 'Error fetching goals: ' prefix, and readyCallback must run exactly once.
import * as common from 'launchdarkly-js-sdk-common';
import EventEmitter from 'launchdarkly-js-sdk-common/src/EventEmitter';

import GoalManager from '../GoalManager';
import browserPlatform from '../browserPlatform';

const PREFIX = 'Error fetching goals: ';

function makeClientVars(fetchJSON, emitter) {
  return {
    getEnvironmentId: () => 'env-id',
    ident: { getContext: () => ({ key: 'user' }) },
    enqueueEvent: () => {},
    requestor: { fetchJSON },
    emitter,
  };
}

function recordingEmitter() {
  const reported = [];
  return { reported, maybeReportError: (e) => reported.push(e) };
}

// Two macrotask turns is enough to drain fetchJSON -> .then -> .catch -> (possible) inner rejection.
async function flush() {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

describe('GoalManager error reporting', () => {
  let unhandled;
  const onUnhandled = (reason) => unhandled.push(reason);

  beforeEach(() => {
    unhandled = [];
    process.on('unhandledRejection', onUnhandled);
  });
  afterEach(() => {
    process.off('unhandledRejection', onUnhandled);
  });

  const cases = [
    // [label, rejection value, expected suffix after the prefix]
    ['an Error with a message', new Error('boom'), 'boom'],
    [
      'an LDFlagFetchError (what Requestor actually rejects with)',
      new common.errors.LDFlagFetchError('Error fetching flag settings: Internal Server Error'),
      'Error fetching flag settings: Internal Server Error',
    ],
    ['null', null, 'null'],
    ['undefined', undefined, 'undefined'],
    ['a plain string', 'str', 'str'],
    ['an Error with an empty message', new Error(''), 'Error'], // String(new Error('')) === 'Error'
    ['a number', 42, '42'],
  ];

  describe.each(cases)('when fetchJSON rejects with %s', (label, reason, suffix) => {
    it('reports LDUnexpectedResponseError with the prefixed message and still calls readyCallback once', async () => {
      const emitter = recordingEmitter();
      const ready = jest.fn();
      GoalManager(
        makeClientVars(() => Promise.reject(reason), emitter),
        browserPlatform({}),
        ready
      );
      await flush();

      expect(emitter.reported).toHaveLength(1);
      expect(emitter.reported[0]).toBeInstanceOf(common.errors.LDUnexpectedResponseError);
      expect(emitter.reported[0].message).toBe(PREFIX + suffix);
      expect(ready).toHaveBeenCalledTimes(1);
      expect(unhandled).toHaveLength(0);
    });
  });

  it('emits goalsReady through a real EventEmitter even when the rejection is null', async () => {
    const emitter = EventEmitter();
    const errors = [];
    emitter.on('error', (e) => errors.push(e));
    const ready = jest.fn();
    GoalManager(
      makeClientVars(() => Promise.reject(null), emitter),
      browserPlatform({}),
      () => {
        ready();
        emitter.emit('goalsReady');
      }
    );
    const goalsReady = new Promise((resolve) => emitter.on('goalsReady', resolve));
    await flush();

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe(PREFIX + 'null');
    expect(ready).toHaveBeenCalledTimes(1);
    await expect(
      Promise.race([
        goalsReady,
        new Promise((_, rej) => setTimeout(() => rej(new Error('goalsReady never emitted')), 200)),
      ])
    ).resolves.toBeUndefined();
  });

  it('prefixes errors thrown while building the GoalTracker (invalid server-supplied regex)', async () => {
    const emitter = recordingEmitter();
    const ready = jest.fn();
    const goals = [{ key: 'g', kind: 'pageview', urls: [{ kind: 'regex', pattern: '(' }] }];
    GoalManager(
      makeClientVars(() => Promise.resolve(goals), emitter),
      browserPlatform({}),
      ready
    );
    await flush();

    expect(emitter.reported).toHaveLength(1);
    expect(emitter.reported[0].message).toMatch(/^Error fetching goals: Invalid regular expression/);
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('survives a user eventUrlTransformer that throws null (non-Error reaching .catch in a supported topology)', async () => {
    const emitter = recordingEmitter();
    const ready = jest.fn();
    const goals = [{ key: 'g', kind: 'pageview', urls: [{ kind: 'substring', substring: 'mydomain' }] }];
    const platform = browserPlatform({
      eventUrlTransformer: () => {
        throw null; // eslint-disable-line no-throw-literal
      },
    });
    GoalManager(
      makeClientVars(() => Promise.resolve(goals), emitter),
      platform,
      ready
    );
    await flush();

    expect(emitter.reported).toHaveLength(1);
    expect(emitter.reported[0].message).toBe(PREFIX + 'null');
    expect(ready).toHaveBeenCalledTimes(1);
    expect(unhandled).toHaveLength(0);
  });
});
