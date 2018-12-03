"use strict";
// This file exists only so that we can run the TypeScript compiler in the CI build
// to validate our typings.d.ts file.
exports.__esModule = true;
var ldclient_js_1 = require("ldclient-js");
var emptyOptions = {};
var logger = ldclient_js_1.createConsoleLogger("info");
var allOptions = {
    bootstrap: {},
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
    privateAttributeNames: ['x'],
    allowFrequentDuplicateEvents: true,
    sendEventsOnlyForVariation: true,
    flushInterval: 1,
    samplingInterval: 1,
    streamReconnectDelay: 1,
    logger: logger
};
var user = { key: 'user' };
var client = ldclient_js_1.initialize('env', user, allOptions);
