
// This file exists only so that we can run the TypeScript compiler in the CI build
// to validate our typings.d.ts file. The code will not actually be run.

import * as ld from 'launchdarkly-js-sdk-common';

const ver: string = ld.version;

const logger: ld.LDLogger = ld.createConsoleLogger("info");
const loggerWithPrefix: ld.LDLogger = ld.createConsoleLogger("info", "prefix");
const userWithKeyOnly: ld.LDUser = { key: 'user' };
const anonUserWithNoKey: ld.LDUser = { anonymous: true };
const user: ld.LDUser = {
  key: 'user',
  secondary: 'otherkey',
  name: 'name',
  firstName: 'first',
  lastName: 'last',
  email: 'test@example.com',
  avatar: 'http://avatar.url',
  ip: '1.1.1.1',
  country: 'us',
  anonymous: true,
  custom: {
    'a': 's',
    'b': true,
    'c': 3,
    'd': [ 'x', 'y' ],
    'e': [ true, false ],
    'f': [ 1, 2 ]
  },
  privateAttributeNames: [ 'name', 'email' ]
};

const client: ld.LDClientBase = {} as ld.LDClientBase;  // wouldn't do this in real life, it's just so the following statements will compile

client.waitForInitialization().then(() => {});
client.waitUntilReady().then(() => {});

const boolFlagValue: ld.LDFlagValue = client.variation('key', false);
const numberFlagValue: ld.LDFlagValue = client.variation('key', 2);
const stringFlagValue: ld.LDFlagValue = client.variation('key', 'default');
const jsonFlagValue: ld.LDFlagValue = client.variation('key', [ 'a', 'b' ]);

const detail: ld.LDEvaluationDetail = client.variationDetail('key', 'default');
const detailValue: ld.LDFlagValue = detail.value;
const detailIndex: number | undefined = detail.variationIndex;
const detailReason: ld.LDEvaluationReason = detail.reason;

const flagSet: ld.LDFlagSet = client.allFlags();
const flagSetValue: ld.LDFlagValue = flagSet['key'];

client.identify(user);
client.identify(user, 'hash');
client.identify(user, undefined, (err, flags) => {});
client.identify(user).then(flags => {});

const user1 = client.getUser();

client.track('key');
client.track('key', { ok: 1 });
client.track('key', null, 1.5);

client.flush(() => {});
client.flush().then(() => {});

client.setStreaming(true);
const handler = (value: any) => { };
client.on('change:flag', handler);
client.off('change:flag', handler);
