# LaunchDarkly JavaScript SDK for Electron

# This is a beta release

This version of the client-side SDKs includes the initial beta version of the Electron SDK. The Electron SDK should not be used in production environments until a final version is released. The source code for this version is on the ["`electron`" branch](https://github.com/launchdarkly/js-client/tree/electron) of the public repository.

## Introduction

This document describes how to set up the LaunchDarkly client-side JavaScript SDK in an [Electron](https://electronjs.org/) application. Please see the [main readme](../../README.md) for a more general description of the client-side SDKs.

This SDK can be used in either the main process or a renderer process, or both. Its API closely resembles the LaunchDarkly [browser SDK](../ldclient-js/README.md).

For an example of using the SDK in a simple Electron application, see [`hello-electron`](https://github.com/launchdarkly/hello-electron).

## Why use this instead of the Node SDK?

Since Electron is based on Node.js, it is possible to run the LaunchDarkly Node SDK in it. This is strongly discouraged, as the Node SDK is meant for server-side use, not for applications that are distributed to users. There are several reasons why this distinction matters:

- The server-side SDKs include an SDK key that can download the entire definition (including rollout rules and individual user targets) of all of your feature flags. If you embed this SDK key in an application, any user who looks inside the application can then access all of your feature flag definitions—which may include sensitive data such as other users' email addresses. The client-side and mobile SDKs use different credentials that do not allow this.

- The server-side SDKs do in fact download your entire flag data using this key, since they have to be able to evaluate flags quickly for any user. That can be quite a large amount of data. The client-side and mobile SDKs, which normally evaluate flags for just one user at a time, use a much more efficient protocol where they request only the active variation for each flag for that specific user.

- The Electron SDK also includes features that are specific to Electron, such as the ability to access main-process flags from the front end as described below.

## Installation

Install the `ldclient-electron` package in your project with `npm`:

    npm install --save ldclient-electron

## Usage

Every Electron application consists of a _main process_, which is essentially a Node.js application, and some number of _renderer processes_, each of which is a Chromium web browser with its own window. These processes have their own independent JavaScript engines and data spaces, although there are ways to communicate between them.

The LaunchDarkly Electron SDK is designed to make it easy to use LaunchDarkly feature flags from within any of these environments. In the normal use case, there is an SDK client running in the main process; the renderer processes can then create client instances that are in effect mirrors of the main one.

To set up the main process client, you need the client-side ID for your LaunchDarkly environment; an object containing user properties (although you can change the user later); and optional configuration properties.

```js
var LDElectron = require('ldclient-electron');

var user = { key: 'example' };
var options = {};
var client = LDElectron.initializeInMain('YOUR_CLIENT_SIDE_ID', user, options);
```

In a renderer process, to create a client object that uses the same feature flag data, you only need to do this:

```js
var client = LDElectron.initializeInRenderer();
```

This gives you an object with the same interface--so you can evaluate feature flags, listen for flag change events, etc., in exactly the same way in the main process and the renderer process. However, only the main-process client is actually communicating with LaunchDarkly; the renderer-process clients are just delegating to the main one. This means that the overhead per application window is minimal (although it is still a good idea to retain a single client instance per window, rather than creating them ad-hoc when you need to evaluate a flag).

Both types of client are initialized asynchronously, so if you want to determine when the client is ready to evaluate feature flags, use the `ready` event or `waitForInitialization()` as described in the [main readme](../../README.md).

## Renderer/browser functionality

When you create a client instance for use in a renderer process with `initializeInRenderer()`, other than having the special "synchronizing to the main client" behavior described above, it is really just an instance of the browser SDK client. This means that the click event and pageview event functionality described in [ldclient-js](../ldclient-js/README.md) is available in Electron windows.

However, whether you can use URL matching rules depends on what the URLs are within your application windows. Often, these are based on an internal file path within the application.

## Node SDK compatibility mode

For developers who are porting LaunchDarkly-enabled Node.js code to Electron, there are differences between the APIs that can be inconvenient. For instance, in the LaunchDarkly Node SDK, `variation()` is an asynchronous call that takes a callback, whereas in the client-side SDKs it is synchronous.

To make this transition easier, the LaunchDarkly Electron SDK provides an optional wrapper that emulates the Node SDK. When creating the main-process client, after calling `initializeInMain`, pass the client object to `createNodeSdkAdapter`. The resulting object will use the Node-style API.

```js
var realClient = LDElectron.initializeInMain('YOUR_CLIENT_SIDE_ID', user, options);
var wrappedClient = LDElectron.createNodeSdkAdapter(realClient);
wrappedClient.waitForInitialization().then(function() {
    wrappedClient.variation(flagKey, user, defaultValue, function(err, result) {
        console.log('flag value is ' + result);
    });
});
```

Keep in mind that the underlying implementation is still the client-side SDK, which has a single-current-user model. Therefore, when you call `client.variation(flagKey, user, defaultValue)` it is really calling `client.identify(user)` first, obtaining flag values for that user, and then evaluating the flag. This will perform poorly if you attempt to evaluate flags for a variety of different users in rapid succession.
