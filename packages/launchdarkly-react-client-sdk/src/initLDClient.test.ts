jest.mock('launchdarkly-js-client-sdk', () => {
  const actual = jest.requireActual('launchdarkly-js-client-sdk');

  return {
    ...actual,
    initialize: jest.fn(),
  };
});
jest.mock('uuid', () => ({ v4: jest.fn() }));

import { v4 } from 'uuid';
import { initialize, LDClient, LDOptions, LDUser } from 'launchdarkly-js-client-sdk';
import initLDClient from './initLDClient';

const ldClientInitialize = initialize as jest.Mock;
const uuid = v4 as jest.Mock;

const clientSideID = 'deadbeef';
const mockUserKey = 'abcdef';
const defaulUser: LDUser = { key: mockUserKey };
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
    uuid.mockImplementation(() => mockUserKey);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('initialise with clientSideID only', async () => {
    await initLDClient(clientSideID);

    expect(ldClientInitialize.mock.calls[0]).toEqual([clientSideID, defaulUser, undefined]);
    expect(mockLDClient.variation).toHaveBeenCalledTimes(0);
  });

  test('initialise with custom user and options', async () => {
    const customUser = { key: 'yus@reactjunkie.com' };
    await initLDClient(clientSideID, customUser, options);

    expect(ldClientInitialize.mock.calls[0]).toEqual([clientSideID, customUser, options]);
    expect(mockLDClient.variation).toHaveBeenCalledTimes(0);
  });

  test('initialise should return camelCased flags', async () => {
    const flagsClient = await initLDClient(clientSideID);

    expect(mockLDClient.variation).toHaveBeenCalledTimes(0);
    expect(flagsClient).toEqual({ flags: { anotherTestFlag: true, testFlag: false }, ldClient: mockLDClient });
  });

  test('initialise should call variation if flags are specified', async () => {
    const customUser = { key: 'yus@reactjunkie.com' };
    const targetFlags = { 'lonely-flag': false, 'lonelier-flag': false };

    const flagsClient = await initLDClient(clientSideID, customUser, options, targetFlags);

    expect(mockLDClient.variation).toHaveBeenCalledTimes(2);
    expect(mockLDClient.variation).toHaveBeenNthCalledWith(1, 'lonely-flag', false);
    expect(mockLDClient.variation).toHaveBeenNthCalledWith(2, 'lonelier-flag', false);
    expect(flagsClient).toEqual({ flags: { lonelyFlag: true, lonelierFlag: true }, ldClient: mockLDClient });
  });
});
