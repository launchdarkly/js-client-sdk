jest.mock('launchdarkly-js-client-sdk', () => {
  const actual = jest.requireActual('launchdarkly-js-client-sdk');

  return {
    ...actual,
    initialize: jest.fn(),
  };
});

import { initialize, LDClient, LDOptions, LDUser } from 'launchdarkly-js-client-sdk';
import { defaultReactOptions, LDReactOptions } from './types';
import initLDClient from './initLDClient';

const ldClientInitialize = initialize as jest.Mock;

const clientSideID = 'deadbeef';
const defaultUser: LDUser = { key: 'abcdef' };
const options: LDOptions = { bootstrap: 'localStorage' };
const flags = { 'test-flag': false, 'another-test-flag': true };

describe('initLDClient', () => {
  let mockLDClient: Partial<LDClient>;

  beforeEach(() => {
    mockLDClient = {
      on: (e: string, cb: () => void) => {
        cb();
      },
      allFlags: () => flags,
      variation: jest.fn(() => true),
    };

    ldClientInitialize.mockImplementation(() => mockLDClient);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('initialise with clientSideID only', async () => {
    const anonUser: LDUser = { anonymous: true };
    await initLDClient(clientSideID);

    expect(ldClientInitialize.mock.calls[0]).toEqual([clientSideID, anonUser, undefined]);
    expect(mockLDClient.variation).toHaveBeenCalledTimes(0);
  });

  test('initialise with custom user and options', async () => {
    const customUser = { key: 'yus@reactjunkie.com' };
    await initLDClient(clientSideID, customUser, defaultReactOptions, options);

    expect(ldClientInitialize.mock.calls[0]).toEqual([clientSideID, customUser, options]);
    expect(mockLDClient.variation).toHaveBeenCalledTimes(0);
  });

  test('initialise should return camelCased flags by default', async () => {
    const flagsClient = await initLDClient(clientSideID);

    expect(mockLDClient.variation).toHaveBeenCalledTimes(0);
    expect(flagsClient).toEqual({ flags: { anotherTestFlag: true, testFlag: false }, ldClient: mockLDClient });
  });

  test('initialise should not transform keys to camel case if option is disabled', async () => {
    const reactOptions: LDReactOptions = { useCamelCaseFlagKeys: false };
    const flagsClient = await initLDClient(clientSideID, defaultUser, reactOptions, options);

    expect(mockLDClient.variation).toHaveBeenCalledTimes(0);
    expect(flagsClient).toEqual({ flags: { 'another-test-flag': true, 'test-flag': false }, ldClient: mockLDClient });
  });

  test('initialise should transform keys to camel case if option is absent', async () => {
    const flagsClient = await initLDClient(clientSideID, defaultUser, defaultReactOptions, options);

    expect(mockLDClient.variation).toHaveBeenCalledTimes(0);
    expect(flagsClient).toEqual({ flags: { anotherTestFlag: true, testFlag: false }, ldClient: mockLDClient });
  });

  test('initialise should call variation if flags are specified', async () => {
    const customUser = { key: 'yus@reactjunkie.com' };
    const targetFlags = { 'lonely-flag': false, 'lonelier-flag': false };

    const flagsClient = await initLDClient(clientSideID, customUser, defaultReactOptions, options, targetFlags);

    expect(mockLDClient.variation).toHaveBeenCalledTimes(2);
    expect(mockLDClient.variation).toHaveBeenNthCalledWith(1, 'lonely-flag', false);
    expect(mockLDClient.variation).toHaveBeenNthCalledWith(2, 'lonelier-flag', false);
    expect(flagsClient).toEqual({ flags: { lonelyFlag: true, lonelierFlag: true }, ldClient: mockLDClient });
  });
});
