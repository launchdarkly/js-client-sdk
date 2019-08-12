import { initialize as ldClientInitialize, LDClient, LDFlagSet, LDOptions, LDUser } from 'launchdarkly-js-client-sdk';
import { v4 as uuid } from 'uuid';
import { defaultReactOptions, LDReactOptions } from './types';
import { camelCaseKeys } from './utils';

interface AllFlagsLDClient {
  flags: LDFlagSet;
  ldClient: LDClient;
}

const initLDClient = async (
  clientSideID: string,
  user: LDUser = { key: uuid() },
  reactOptions: LDReactOptions = defaultReactOptions,
  options?: LDOptions,
  targetFlags?: LDFlagSet,
): Promise<AllFlagsLDClient> => {
  const ldClient = ldClientInitialize(clientSideID, user, options);

  return new Promise<AllFlagsLDClient>(resolve => {
    ldClient.on('ready', () => {
      let rawFlags: LDFlagSet = {};

      if (targetFlags) {
        for (const flag in targetFlags) {
          rawFlags[flag] = ldClient.variation(flag, targetFlags[flag]);
        }
      } else {
        rawFlags = ldClient.allFlags();
      }

      const flags = reactOptions.useCamelCaseFlagKeys ? camelCaseKeys(rawFlags) : rawFlags;
      resolve({ flags, ldClient });
    });
  });
};

export default initLDClient;
