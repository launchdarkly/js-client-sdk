import { initialize as ldClientInitialize, LDClient, LDFlagSet, LDOptions, LDUser } from 'ldclient-js';
import { v4 as uuid } from 'uuid';
import { camelCaseKeys } from './utils';

interface AllFlagsLDClient {
  flags: LDFlagSet;
  ldClient: LDClient;
}

const initLDClient = async (
  clientSideID: string,
  user: LDUser = { key: uuid() },
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

      resolve({ flags: camelCaseKeys(rawFlags), ldClient });
    });
  });
};

export default initLDClient;
