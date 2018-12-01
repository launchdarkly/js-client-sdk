
// This file exists only so that we can run the TypeScript compiler in the CI build
// to validate our typings.d.ts file.

import { createConsoleLogger, LDClient, LDLogger, LDOptions, LDUser, initialize } from 'ldclient-js';

var emptyOptions: LDOptions = {};
var logger: LDLogger = createConsoleLogger("info");
var allOptions: LDOptions = {
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
  privateAttributeNames: [ 'x' ],
  allowFrequentDuplicateEvents: true,
  sendEventsOnlyForVariation: true,
  flushInterval: 1,
  samplingInterval: 1,
  streamReconnectDelay: 1,
  logger: logger
};
var user: LDUser = { key: 'user' };
var client: LDClient = initialize('env', user, allOptions);
