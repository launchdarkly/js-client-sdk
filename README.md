# LaunchDarkly SDKs for Client-Side JavaScript

[![Circle CI](https://circleci.com/gh/launchdarkly/js-client/tree/electron.svg?style=svg)](https://circleci.com/gh/launchdarkly/js-client/tree/electron)

# This is a beta release

This version of the client-side SDKs includes the initial beta version of the Electron SDK. The Electron SDK should not be used in production environments until a final version is released. The source code for this version is on the ["`electron`" branch](https://github.com/launchdarkly/js-client/tree/electron) of the public repository.

If you are using the JavaScript SDK in a browser rather than Electron, please use the latest full release of `ldclient-js`, version 2.8.0.

## Introduction

These are the official LaunchDarkly client-side JavaScript SDKs. There are two: `ldclient-js`, which is meant to be used from within a web page, and `ldclient-electron`, which is for [Electron](https://electronjs.org/) applications. Both of them provide basically the same functionality:

* Making feature flags available to your JavaScript code.
* Sending events to LaunchDarkly for analytics and/or A/B testing.

These are _client-side_ SDKs in that they are meant to be used with code that is deployed to an end user, either in a web browser or in a desktop application. They do not use the SDK key that the server-side SDKs use, since an end user who acquired that key could use it to access the details of your LaunchDarkly environment; instead, they use the "client-side ID" associated with your environment.

If you are developing server-side code in Node.js, the [LaunchDarkly SDK for Node.js](https://github.com/launchdarkly/node-client) is more appropriate.

Note that in order for LaunchDarkly to make your feature flags available to these SDKs, you must check the "Make this flag available to client-side SDKs" box on the Settings page for each flag. This is so that if you have a web application with a large number of flags used on the server side and a smaller number used on the front end, the client-side SDK can save bandwidth by only getting the subset of flags that it will use.

## Setup and compatibility

The setup processes and requirements for the SDKs are described in more detail here:

* [for browsers (ldclient-js)](packages/ldclient-js/README.md)
* [for Electron (ldclient-electron)](packages/ldclient-electron/README.md)

## Basic usage

The following SDK features work the same regardless of which of the two SDK variants you're using.

### Initializing

The function for creating a client instance is different in each execution environment, but it normally takes three parameters: your client-side environment ID, a set of user properties, and an object containing optional settings.

The client-side ID uniquely identifies a specific project and environment within your LaunchDarkly account (available
on your [account settings page](https://app.launchdarkly.com/settings#/projects)). This stays the same throughout the lifetime of the client object.

The user object can contain any of the properties described [here](https://docs.launchdarkly.com/docs/targeting-users). The SDK always has a single current user; you can change it after initialization (see "Changing users").

When the client is first created, it normally has to perform an asynchronous task to obtain the feature flag values for the user (although you can short-circuit this; see "Bootstrapping"). To determine when this has finished, you can listen for the `ready` event, or use the equivalent Promise-based method `waitForInitialization()`:

```js
client.on('ready', function() {
  // now we can evaluate some feature flags
});

// or:
client.waitForInitialization().then(function() {
  // now we can evaluate some feature flags
});
```

If you try to evaluate feature flags before the client is ready, it will behave as it would if no flags existed (i.e. `variation` will return a default value).

### Bootstrapping

The `bootstrap` property in the client options allows you to speed up the startup process by providing an initial set of flag values.

If you set `bootstrap` to an object, the client will treat it as a map of flag keys to flag values. These values can be whatever you want (although in the browser environment, there is a [special mechanism](packages/ldclient-js/README.md#Bootstrapping%20from%20the%20server%20side) that is commonly used). The client will immediately start out in a ready state using these values. It will still make an initial request to LaunchDarkly to get the actual latest values, but that will happen in the background.

If you set `bootstrap` to the string `"localstorage"`, the client will try to get flag values from persistent storage, using a unique key that is based on the user properties. In a browser, this is the `window.localStorage` mechanism; in Electron, it uses files in the [`userData`](https://electronjs.org/docs/all?query=getpath#appgetpathname) directory. If the client finds flag values stored for this user, it uses them and starts up immediately in a ready state-- but also makes a background request to LaunchDarkly to get the latest values, and stores them as soon as it receives them.

### Feature flags

To evaluate any feature flag for the current user, call `variation`:

```js
var showFeature = client.variation("YOUR_FEATURE_KEY", false);

if (showFeature)  {
  // feature flag is  on
} else {
  // feature flag is off
}
```

The return value of `variation` will always be either one of the variations you defined for your flag in the LaunchDarkly dashboard, or the default value. The default value is the second parameter to `variation` (in this case `false`) and it is what the client will use if it's not possible to evaluate the flag (for instance, if the flag key does not exist, or if something about the definition of the flag is invalid).

You can also fetch all feature flags for the current user:

```js
var flags = client.allFlags();
var showFeature = flags['YOUR_FEATURE_KEY'];
```

This returns a key-value map of all your feature flags. It will contain `null` values for any flags that could not be evaluated.

Note that both of these methods are synchronous. The client always has the last known flag values in memory, so retrieving them does not involve any I/O.

### Changing users

The `identify()` method tells the client to change the current user, and obtain the feature flag values for the new user. For example, on a sign-in page in a single-page app, you may initialize the client with an anonymous user; when the user logs in, you'd want the feature flag settings for the authenticated user. 

If you provide a callback function, it will be called (with a map of flag keys and values) once the flag values for the new user are available; after that point, `variation()` will be using the new values. You can also use a Promise for the same purpose.

```js
var newUser = { key: 'someone-else', name: 'John' };

client.identify(newUser, function(newFlags) {
  console.log('value of flag for this user is: ' + newFlags["YOUR_FEATURE_KEY"]);
  console.log('this should be the same: ' + client.variation("YOUR_FEATURE_KEY"));
});

// or:
client.identify(newUser).then(function(newFlags) {
  // as above
});
```

Note that the client always has _one_ current user. The client-side SDKs are not designed for evaluating flags for different users at the same time.

### Analytics events

Evaluating flags, either with `variation()` or with `allFlags()`, produces analytics events which you can observe on your LaunchDarkly Debugger page. Specifying a user with `identify()` (and also the initial user specified in the client constructor) also produces an analytics event, which is how LaunchDarkly receives your user data.

You can also explicitly send an event with any data you like using the `track` function:

```js
client.track('my-custom-event-key', { customProperty: someValue });
```

You can completely disable event sending by setting `sendEvents` to `false` in the client options, but be aware that this means you will not have user data on your LaunchDarkly dashboard.

### Receiving live updates

By default, the client requests feature flag values only once per user (i.e. once at startup time, and then each time you call `identify()`). You can also use a persistent connection to receive flag updates whenever they occur.

Setting `streaming` to `true` in the client options, or calling `client.setStreaming(true)`, turns on this behavior. LaunchDarkly will push new values to the SDK, which will update the current feature flag state in the background, ensuring that `variation()` will always return the latest values.

If you want to be notified when a flag has changed, you can use an event listener for a specific flag:

```js
client.on('change:YOUR_FEATURE_KEY', function(newValue, oldValue) {
  console.log('The flag was ' + oldValue + ' and now it is ' + newValue);
});
```

Or, you can listen for all feature flag changes:

```js
client.on('change', function(allFlagChanges)) {
  Object.keys(allFlagChanges).forEach(function(key) {
    console.log('Flag ' + key + ' is now ' + allFlagChanges[key]);
  });
});
```

Subscribing to `change` events will automatically turn on streaming mode too, unless you have explicitly set `streaming` to `false`.

### Logging

The SDKs have a simple logging mechanism that can be customized. The browser SDK normally uses the `console` object for logging, and the Electron SDK normally uses the `winston` package. There are four logging levels: `debug`, `info`, `warn`, and `error`; by default, `debug` and `info` messages are hidden. See the [TypeScript definitions](packages/ldclient-js-common/typings.d.ts) for `LDLogger`, `LDOptions`, and `createConsoleLogger` for more details.

## Development information

This project is now a monorepo containing three packages: `ldclient-js` (the SDK for browsers), `ldclient-electron` (the SDK for Electron), and `ldclient-js-common` (the basic client logic that is used by both of those). These are all published to NPM for each release.

To build and test the entire project, from the project root directory:
* `npm install`
* `npm run prepare` (this takes the place of `npm install` for the individual packages)
* `npm run build` (runs `npm run build` in each individual package)
* `npm run test` (runs `npm test`  in each individual package)

## Community

Here are resources from our awesome community:

* [TrueCar/react-launch-darkly](https://github.com/TrueCar/react-launch-darkly/): A set of component helpers to add support for LaunchDarkly to your React.js app
* [yusinto/ld-redux](https://github.com/yusinto/ld-redux/): A library to integrate LaunchDarkly with React and Redux
* [tdeekens/flopflip](https://github.com/tdeekens/flopflip): A flexible feature-toggling library that integrates with LaunchDarkly

## About LaunchDarkly

* LaunchDarkly is a continuous delivery platform that provides feature flags as a service and allows developers to iterate quickly and safely. We allow you to easily flag your features and manage them from the LaunchDarkly dashboard. With LaunchDarkly, you can:
  * Roll out a new feature to a subset of your users (like a group of users who opt-in to a beta tester group), gathering feedback and bug reports from real-world use cases.
  * Gradually roll out a feature to an increasing percentage of users, and track the effect that the feature has on key metrics (for instance, how likely is a user to complete a purchase if they have feature A versus feature B?).
  * Turn off a feature that you realize is causing performance problems in production, without needing to re-deploy, or even restart the application with a changed configuration file.
  * Grant access to certain features based on user attributes, like payment plan (eg: users on the ‘gold’ plan get access to more features than users in the ‘silver’ plan). Disable parts of your application to facilitate maintenance, without taking everything offline.
* LaunchDarkly provides feature flag SDKs for
  * [Java](http://docs.launchdarkly.com/docs/java-sdk-reference 'Java SDK')
  * [JavaScript](http://docs.launchdarkly.com/docs/js-sdk-reference 'LaunchDarkly JavaScript SDK')
  * [PHP](http://docs.launchdarkly.com/docs/php-sdk-reference 'LaunchDarkly PHP SDK')
  * [Python](http://docs.launchdarkly.com/docs/python-sdk-reference 'LaunchDarkly Python SDK')
  * [Go](http://docs.launchdarkly.com/docs/go-sdk-reference 'LaunchDarkly Go SDK')
  * [Node.JS](http://docs.launchdarkly.com/docs/node-sdk-reference 'LaunchDarkly Node SDK')
  * [Electron](http://docs.launchdarkly.com/docs/electron-sdk-reference 'LaunchDarkly Electron SDK')
  * [.NET](http://docs.launchdarkly.com/docs/dotnet-sdk-reference 'LaunchDarkly .Net SDK')
  * [Ruby](http://docs.launchdarkly.com/docs/ruby-sdk-reference 'LaunchDarkly Ruby SDK')
  * [iOS](http://docs.launchdarkly.com/docs/ios-sdk-reference 'LaunchDarkly iOS SDK')
  * [Android](http://docs.launchdarkly.com/docs/android-sdk-reference 'LaunchDarkly Android SDK')
* Explore LaunchDarkly
  * [launchdarkly.com](http://www.launchdarkly.com/ 'LaunchDarkly Main Website')
    for more information
  * [docs.launchdarkly.com](http://docs.launchdarkly.com/ 'LaunchDarkly Documentation')
    for our documentation and SDKs
  * [apidocs.launchdarkly.com](http://apidocs.launchdarkly.com/ 'LaunchDarkly API Documentation')
    for our API documentation
  * [blog.launchdarkly.com](http://blog.launchdarkly.com/ 'LaunchDarkly Blog Documentation')
    for the latest product updates
  * [Feature Flagging Guide](https://github.com/launchdarkly/featureflags/ 'Feature Flagging Guide')
    for best practices and strategies
