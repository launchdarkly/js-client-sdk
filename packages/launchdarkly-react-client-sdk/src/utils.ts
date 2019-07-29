import { LDFlagSet } from 'launchdarkly-js-client-sdk';
import camelCase from 'lodash.camelcase';

export const camelCaseKeys = (rawFlags: LDFlagSet) => {
  const flags: LDFlagSet = {};
  for (const rawFlag in rawFlags) {
    // Exclude system keys
    if (rawFlag.indexOf('$') !== 0) {
      const camelCasedKey = camelCase(rawFlag);
      flags[camelCasedKey] = rawFlags[rawFlag];
    }
  }

  return flags;
};
