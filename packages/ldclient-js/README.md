# LaunchDarkly JavaScript SDK for Browsers

# This is a beta release

This version of the client-side SDKs includes the initial beta version of the Electron SDK, and also includes changes to the JavaScript SDK for browsers. The beta version should not be used in production environments. The source code for this version is on the ["`electron`" branch](https://github.com/launchdarkly/js-client/tree/electron) of the public repository.

## Introduction

This document describes how to set up the LaunchDarkly client-side JavaScript SDK to be used on a web page. Please see the [main readme](../../README.md) for a more general description of the client-side SDKs.

## Browser compatibility

The SDK supports the following browsers:

* Chrome (any recent)
* Firefox (any recent)
* Safari (any recent)
* Internet Explorer (IE10+)\*
* Edge (any recent)\*
* Opera (any recent)\*

\* These browsers do not support streaming new flags to connected clients, even when `client.on('change')` is called.

## Installation

It can be installed in two ways:

1. Via the `npm` package: `npm install --save ldclient-js`

2. A minimized version of the script is also hosted on our CDN, and can be included via a `script` tag:

```
<script src="https://app.launchdarkly.com/snippet/ldclient.min.js">
```

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

## Functionality specific to the browser SDK

This section describes features that only work in a browser context, as opposed to general features like flag evaluation that are described in the [main readme](../../README.md).

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

### Click and pageview events

If you've defined [click or pageview goals](https://docs.launchdarkly.com/docs/running-ab-tests) in LaunchDarkly, they'll be sent automatically once the client has been initialized. You do not have to do anything else with the client to send click or pageview goals.

### Single page apps

The SDK automatically handles URL changes (made via the HTML5 history API or by changing the URL hash fragment), and will trigger pageview and click events correctly.

### Custom events

Custom events sent with the `track` method are treated slightly differently by the browser SDK: the client normally expects that the event key you pass to `track` corresponds to one of your custom goals. You can still send custom events whose keys do not correspond to a goal, but the client will log a warning if you do.

### Do Not Track

In browsers that have a "do not track" option, the LaunchDarkly SDK will not attempt to send any analytics events if this option is set.
