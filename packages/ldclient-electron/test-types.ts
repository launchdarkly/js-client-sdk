
// This file exists only so that we can run the TypeScript compiler in the CI build
// to validate our typings.d.ts file.

import {
	createConsoleLogger,
	LDElectronMainClient,
	LDElectronNodeWrapperClient,
	LDElectronRendererClient,
	LDLogger,
	LDOptions,
	LDUser,
	initializeInRenderer,
	initializeMain,
	initializeMainWithNodeApi
} from 'ldclient-electron';

var emptyOptions: LDOptions = {};
var logger: LDLogger = createConsoleLogger("info");
var allOptions: LDOptions = {
  bootstrap: { },
  baseUrl: '',
  eventsUrl: '',
  streamUrl: '',
  streaming: true,
  useReport: true,
  sendLDHeaders: true,
  evaluationReasons: true,
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
var client1: LDElectronMainClient = initializeMain('env', user, allOptions);
var client2: LDElectronRendererClient = initializeInRenderer('env', allOptions);
var client2WithDefaults: LDElectronRendererClient = initializeInRenderer();
var client3: LDElectronNodeWrapperClient = initializeMainWithNodeApi('env', user, allOptions);
