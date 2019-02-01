# LaunchDarkly SDK for Browser JavaScript - Non-React Interface

## Introduction

This is the main package for the LaunchDarkly client-side JavaScript SDK for web browser applications. It provides the full client API that works with browser-based JavaScript applications in any framework. There is also an optional React wrapper that provides a different API specifically for React applications.

For a general overview of JavaScript SDK characteristics, see the [main README](../../README.md). This file describes how to use the SDK without React. If you are using the React wrapper, see the [React README](../ldclient-react/README.md).

## Installation

The SDK can be installed in two ways:

1. Via the `npm` package: `npm install --save ldclient-js`

2. A minimized version of the script is also hosted on our CDN, and can be included via a `script` tag:

```
<script src="https://app.launchdarkly.com/snippet/ldclient.min.js">
```

The hosted copy of `ldclient.min.js` is updated after every release, so be aware that if you use the `script` tag approach, the SDK may change without warning.

## Usage and API

The sections below describe the most common actions and options supported by the SDK. Some other options are also described in the online [JavaScript SDK Reference](https://docs.launchdarkly.com/docs/js-sdk-reference).

The authoritative full description of all properties and methods is in the TypeScript declaration files [here](typings.d.ts) and [here](../ldclient-js-common/typings.d.ts).

### Initializing the client

To create a client instance, pass your environment's client-side ID (available on your [account settings page](https://app.launchdarkly.com/settings#/projects)) and user context to the `LDClient.initialize` function:

```js
var user = { key: 'user.example.com' };
var client = LDClient.initialize('YOUR_CLIENT_SIDE_ID', user);
```

The user object can contain any of the properties described [here](https://docs.launchdarkly.com/docs/targeting-users). The SDK always has a single current user; you can change it after initialization (see "Changing users").

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

The [bootstrapping](../../README.md#Bootstrapping) mechanism lets you provide initial feature flag values at startup time. In a web application, a common approach is for your back-end application code to obtain flag values from its own server-side SDK and then pass them to the front end.

LaunchDarkly's server-side SDKs have a function called `allFlagsState`, which returns a snapshot of the feature flags for a particular user. This data structure can be passed directly to the `bootstrap` property of the front-end client; you will also want to pass the user properties. Here's an example of how this might be done if you are using Node.js, Express, and Mustache templates on the back end.

```js
// in the back-end code:
app.get('/page', function(req, res) {
  var user = { key: 'example-user' };
  client.allFlagsState(user, function(flagsData) {
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

## Examples

For examples of using the SDK in a simple JavaScript application, see [`hello-js`](https://github.com/launchdarkly/hello-js) and [`hello-bootstrap`](https://github.com/launchdarkly/hello-bootstrap).
