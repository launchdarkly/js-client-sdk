
// This file exists only so that we can run the TypeScript compiler in the CI build
// to validate our typings.d.ts file. The code will not actually be run.

import * as ld from 'launchdarkly-js-client-sdk';

import LaunchDarkly from 'launchdarkly-js-client-sdk';

const ver: string = LaunchDarkly.version;

const emptyOptions: ld.LDOptions = {};
const logger: ld.LDLogger = ld.basicLogger({ level: 'info' });
const allOptions: ld.LDOptions = {
  bootstrap: { },
  hash: '',
  baseUrl: '',
  eventsUrl: '',
  streamUrl: '',
  streaming: true,
  useReport: true,
  sendLDHeaders: true,
  evaluationReasons: true,
  fetchGoals: true,
  sendEvents: true,
  allAttributesPrivate: true,
  privateAttributes: [ 'x' ],
  sendEventsOnlyForVariation: true,
  flushInterval: 1,
  streamReconnectDelay: 1,
  eventUrlTransformer: url => url + 'x',
  disableSyncEventPost: true,
  logger: logger,
};
const userWithKeyOnly: ld.LDUser = { key: 'user' };
const anonymousUser: ld.LDUser = { key: 'anon-user', anonymous: true };
const user: ld.LDUser = {
  key: 'user',
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

const singleKindContext: ld.LDContext = {
  kind: 'user',
  key: 'user',
  aCustomValue: {
    some: 'value'
  },
  _meta: {
    privateAttributes: ['aCustomValue']
  }
}

const multiKindContext: ld.LDContext = {
  kind: 'multi',
  user: {
    key: 'user',
    aCustomValue: {
      some: 'value'
    },
    _meta: {
      privateAttributes: ['aCustomValue']
    }
  },
  device: {
    key: 'device'
  }
}

const client: ld.LDClient = ld.initialize('env', user, allOptions);

client.waitUntilReady().then(() => {});
client.waitForInitialization().then(() => {});
client.waitUntilGoalsReady().then(() => {});

client.identify(user).then(() => {});
client.identify(user, undefined, () => {});
client.identify(user, 'hash').then(() => {});

client.identify(singleKindContext).then(() => {});
client.identify(singleKindContext, undefined, () => {});
client.identify(singleKindContext, 'hash').then(() => {});

client.identify(multiKindContext).then(() => {});
client.identify(multiKindContext, undefined, () => {});
client.identify(multiKindContext, 'hash').then(() => {});

const context: ld.LDContext = client.getContext();

client.flush(() => {});
client.flush().then(() => {});

const boolFlagValue: ld.LDFlagValue = client.variation('key', false);
const numberFlagValue: ld.LDFlagValue = client.variation('key', 2);
const stringFlagValue: ld.LDFlagValue = client.variation('key', 'default');

const detail: ld.LDEvaluationDetail = client.variationDetail('key', 'default');
const detailValue: ld.LDFlagValue = detail.value;
const detailIndex: number | undefined = detail.variationIndex;
const detailReason: ld.LDEvaluationReason | undefined = detail.reason;

client.setStreaming(true);
client.setStreaming();

function handleEvent() {}
client.on('event', handleEvent);
client.off('event', handleEvent);

client.track('event');
client.track('event', { someData: 'x' });
client.track('event', null, 3.5);

const flagSet: ld.LDFlagSet = client.allFlags();
const flagSetValue: ld.LDFlagValue = flagSet['key'];

client.close(() => {});
client.close().then(() => {});
