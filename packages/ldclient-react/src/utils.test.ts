import { camelCaseKeys } from './utils';
import { LDOptions } from 'ldclient-js';

describe('Utils', () => {
  test('camelCaseKeys should ignore system keys', () => {
    const bootstrap = {
      'test-flag': true,
      'another-test-flag': false,
      $flagsState: {
        'test-flag': { version: 125, variation: 0, trackEvents: true },
        'another-test-flag': { version: 18, variation: 1 },
      },
      $valid: true,
    };

    const result = camelCaseKeys(bootstrap);
    expect(result).toEqual({ testFlag: true, anotherTestFlag: false });
  });
});
