"use strict";
// This file exists only so that we can run the TypeScript compiler in the CI build
// to validate our typings.d.ts file.
exports.__esModule = true;
var ldclient_electron_1 = require("ldclient-electron");
var emptyOptions = {};
var logger = ldclient_electron_1.createConsoleLogger("info");
var allOptions = {
    bootstrap: {},
    baseUrl: '',
    eventsUrl: '',
    streamUrl: '',
    streaming: true,
    useReport: true,
    sendLDHeaders: true,
    evaluationReasons: true,
    sendEvents: true,
    allAttributesPrivate: true,
    privateAttributeNames: ['x'],
    allowFrequentDuplicateEvents: true,
    sendEventsOnlyForVariation: true,
    flushInterval: 1,
    samplingInterval: 1,
    streamReconnectDelay: 1,
    logger: logger
};
var user = { key: 'user' };
var client1 = ldclient_electron_1.initializeMain('env', user, allOptions);
var client2 = ldclient_electron_1.initializeInRenderer('env', allOptions);
var client2WithDefaults = ldclient_electron_1.initializeInRenderer();
var client3 = ldclient_electron_1.createNodeSdkAdapter(client1);
