# LaunchDarkly SDK for Browser JavaScript

[![Circle CI](https://circleci.com/gh/launchdarkly/js-client/tree/master.svg?style=svg)](https://circleci.com/gh/launchdarkly/js-client/tree/master)

## Introduction

This is the official LaunchDarkly JavaScript SDK for web browser applications. It provides the same functionality as all of the LaunchDarkly SDKs:

* Making feature flags available to your JavaScript code.
* Sending events to LaunchDarkly for analytics and/or A/B testing.
* Optionally maintaining a streaming connection to LaunchDarkly for immediate notification of any feature flag changes.

The JavaScript SDK has two special requirements in terms of your LaunchDarkly environment. First, in terms of the credentials for your environment that appear on your [Account Settings](https://app.launchdarkly.com/settings/projects) dashboard, the JavaScript SDK uses the "Client-side ID"-- not the "SDK key" or the "Mobile key". Second, for any feature flag that you will be using in JavaScript code, you must check the "Make this flag available to client-side SDKs" box on that flag's Settings page.

## React

The SDK does not require any particular JavaScript framework. However, if you are using React, there is an add-on to simplify use of the SDK. See the [`ldclient-react` documentation](packages/ldclient-react/README.md).

## Browser compatibility

The SDK supports the following browsers:

* Chrome (any recent)
* Firefox (any recent)
* Safari (any recent)
* Internet Explorer (IE10+)\*
* Edge (any recent)\*
* Opera (any recent)\*

\* These browsers do not have built-in support for streaming; see [#EventSource]("EventSource") below.

_If you are using JavaScript in a non-browser environment,_ please see our [Node.js SDK](https://github.com/launchdarkly/node-client) and [Electron SDK](https://github.com/launchdarkly/electron-client).

## Installation

The SDK can be installed in two ways:

1. Via the `npm` package: `npm install --save ldclient-js`

2. A minimized version of the script is also hosted on our CDN, and can be included via a `script` tag:

```
<script src="https://app.launchdarkly.com/snippet/ldclient.min.js">
```

The hosted copy of `ldclient.min.js` is updated after every release, so be aware that if you use the `script` tag approach, the SDK may change without warning.

## Browser feature support

Web browsers vary widely in their support of specific features and standards. Three features that are used by the LaunchDarkly SDK that may not be available on every browser are `EventSource`, `document.querySelectorAll()`, and `Promise`. See below for more about how to ensure that these will work.

### EventSource

The SDK uses [`EventSource`](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) to provide a live streaming connection to LaunchDarkly, if you have enabled streaming (by using the `streaming` property or the `setStreaming` method, or by subscribing to `change` events). If you never enable streaming, `EventSource` is not used.

It is widely available in browsers, [except for Internet Explorer and Microsoft Edge](https://caniuse.com/#search=EventSource). If you wish to support these, and you need streaming support, you can install a polyfill such as [event-source-polyfill](https://github.com/Yaffle/EventSource).

#### CDN

You can load the polyfill via a script tag in the `<head>` before the script where you initialize `LDClient`:

    <script src="https://unpkg.com/event-source-polyfill@0.0.12/src/eventsource.min.js"></script>

#### NPM or Yarn

    npm install event-source-polyfill@0.0.12

Then import it before the module that initializes the LaunchDarkly client:

    require('event-source-polyfill');

### Document.querySelectorAll() polyfill

The SDK uses `querySelectorAll` to support click events for A/B testing.

It is widely available in browser, [except in old versions of Internet Explorer](https://caniuse.com/#feat=queryselector). If you wish to support these, and you need A/B testing support, you can install a polyfill such as [polyfill-queryselector](https://github.com/cobbdb/polyfill-queryselector).

#### CDN

You can load the polyfill via a script tag in the `<head>` before the script where you initialize `LDClient`:

    <script src="https://unpkg.com/polyfill-queryselector@1.0.2/querySelector.js"></script>

#### NPM or Yarn

    npm install polyfill-queryselector@1.0.2

Then import it before the module that initializes the LaunchDarkly client:

    require('polyfill-queryselector');

### Promise polyfill

The SDK relies heavily on JavaScript `Promise`s. [Browsers that do not support `Promise`](https://caniuse.com/#search=Promise) include Internet Explorer and older versions of Microsoft Edge. If you need to support these, you will need to install a polyfill for `Promise`, such as [es6-promise](https://github.com/stefanpenner/es6-promise).

#### CDN

You can load the polyfill via a script tag in the `<head>` before the script where you initialize `LDClient`:

    <script src="https://unpkg.com/es6-promise@4.2.4/dist/es6-promise.auto.min.js"></script>

#### NPM or Yarn

    npm install es6-promise@4.2.4

Then import it before the module that initializes the LaunchDarkly client:

    require('es6-promise/auto');

## Usage

### Initializing the client

To create a client instance, pass your environment's client-side ID (available on your [account settings page](https://app.launchdarkly.com/settings#/projects)) and user context to the `LDClient.initialize` function:

```js
var user = { key: 'user.example.com' };
var client = LDClient.initialize('YOUR_CLIENT_SIDE_ID', user);
```

The user object can contain any of the properties described [here](https://docs.launchdarkly.com/docs/targeting-users). The SDK always has a single current user; you can change it after initialization (see "Changing users"). If you want the SDK to generate a unique key for the user, omit the `key` property and set the `anonymous` property to `true`.

The client is initialized asynchronously, so if you want to determine when the client is ready to evaluate feature flags, use the `ready` event, or the Promise-based method `waitForInitialization()`:

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

Out of the box, initializing the client will make a remote request to LaunchDarkly, so it may take approximately 100 milliseconds before the ready event is emitted. If you require feature flag values before rendering the page, we recommend bootstrapping the client-- see below.

### Bootstrapping from the server side

The bootstrapping mechanism lets you provide initial feature flag values at startup time. In a web application, a common approach is for your back-end application code to obtain flag values from its own server-side SDK and then pass them to the front end.

LaunchDarkly's server-side SDKs have a function called `allFlagsState`, which returns a snapshot of the feature flags for a particular user. This data structure can be passed directly to the `bootstrap` property of the front-end client; you will also want to pass the user properties. Here's an example of how this might be done if you are using Node.js, Express, and Mustache templates on the back end.

```js
// in the back-end code:
app.get('/page', function(req, res) {
  var user = { key: 'example-user' };
  client.allFlagsState(user, function(err, flagsData) {
    templateVars = {
      user: user,
      allFlags: flagsData
    };
    res.render('myPage', templateVars);
  });
});

// in a script within the page template:
var user = {{ user }};
var clientOptions = {
  bootstrap: {{ allFlags }}
};
var client = ldclient.initialize('YOUR_CLIENT_SIDE_ID', user, clientOptions);
```

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

If you've defined [click or pageview goals](https://docs.launchdarkly.com/docs/running-ab-tests) in LaunchDarkly, they'll be sent automatically once the client has been initialized. You do not have to do anything else with the client to send click or pageview goals. The SDK will generate pageview events correctly regardless of how the URL is changed (via the HTML5 history API, by changing the URL hash fragment, etc.).

You can completely disable event sending by setting `sendEvents` to `false` in the client options, but be aware that this means you will not have user data on your LaunchDarkly dashboard.

In browsers that have a "do not track" option, the SDK will not attempt to send any analytics events if this option is set.

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

By default, the SDK uses the `winston` package. There are four logging levels: `debug`, `info`, `warn`, and `error`; by default, `debug` and `info` messages are hidden. See the [TypeScript definitions](https://github.com/launchdarkly/js-client/tree/master/packages/ldclient-js-common/typings.d.ts) for `LDLogger`, `LDOptions`, and `createConsoleLogger` for more details.

### Secure mode

Secure mode ensures that feature flag settings for a user are kept private, and that one user cannot inspect the settings for another user. Secure mode works by having you include a server-generated HMAC SHA256 hash of your user key, signed with the SDK key for your environment.

You can enable secure mode for each environment on your [account settings page](https://app.launchdarkly.com/settings#/projects). You should send the computed hash for your user in the `options` array during client initialization:

```js
var user = { key: 'user.example.com' };
var client = LDClient.initialize(
  'YOUR_CLIENT_SIDE_ID',
  user,
  (options = {
    hash: 'SERVER_GENERATED_HASH',
  })
);
```

Each of our server-side SDKs includes a method to compute the secure mode hash for a user. You can pass this to your front-end code in a template. For example:

```js
var client = LDClient.initialize('YOUR_CLIENT_SIDE_ID', user, options = {
       hash: {{ ldclient.secure_mode_hash(user) }} // this is a template directive, and the ldclient instance here is your server-side SDK client
  });
```

To compute the hash yourself, locate the SDK key for your environment on your account settings page. Then, compute an HMAC SHA256 hash of your user key, using your SDK key as a secret. Here's what this would look like in Node.js:

```js
var crypto = require('crypto');
var hmac = crypto.createHmac('sha256', 'YOUR_SDK_KEY');
hmac.update('YOUR_USER_KEY');
hash = hmac.digest('hex');
```

If you change the user context dynamically with `identify()`, you can provide a new secure mode hash at the same time:

```js
client.identify(newUser, hash, function() {
  console.log("New user's flags available");
});
```

## Learn more

For an additional overview with code samples, see the online [JavaScript SDK Reference](https://docs.launchdarkly.com/docs/js-sdk-reference).

The authoritative full description of all properties and methods is in the TypeScript declaration files for [ldclient-js](blob/master/packages/ldclient-js/typings.d.ts) and [ldclient-js-common](blob/master/packages/ldclient-js-common/typings.d.ts).

For examples of using the SDK in a simple JavaScript application, see [`hello-js`](https://github.com/launchdarkly/hello-js) and [`hello-bootstrap`](https://github.com/launchdarkly/hello-bootstrap).

## Contributing

We encourage pull-requests and other contributions from the community. We've also published an [SDK contributor's guide](http://docs.launchdarkly.com/docs/sdk-contributors-guide) that provides a detailed explanation of how our SDKs work. See [CONTRIBUTING](CONTRIBUTING.md) for more developer information about this project.

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
