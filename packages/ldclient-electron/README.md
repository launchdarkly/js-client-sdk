# LaunchDarkly Javascript SDK for Electron

## Introduction

This document describes how to set up the LaunchDarkly client-side JavaScript SDK in an [Electron](https://electronjs.org/) application. Please see the [main readme](../../README.md) for a more general description of the client-side SDKs.

This SDK can be used in either the main process or a renderer process, or both. Its API closely resembles the LaunchDarkly [browser SDK](../ldclient-js/README.md).

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
var client = LDElectron.initializeMain('YOUR_CLIENT_SIDE_ID', user, options);
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
