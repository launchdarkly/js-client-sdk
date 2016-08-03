# LaunchDarkly SDK for Client-Side JavaScript

## Introduction

This is the official LaunchDarkly client-side JavaScript SDK. This SDK does two things:

* Makes feature flags available to your client-side (front-end) JavaScript code.
* Sends click, pageview, and custom events from your front-end for A/B tests and analytics.

## Installation

There are two ways to install the client-side SDK:

1. Via the `npm` package:

        npm install --save ldclient-js

2. A minimized version of the script is also hosted on `npmcdn`, and can be included via a `script` tag:

        <script src="https://npmcdn.com/ldclient-js/dist/client.min.js">

## Basics

To create a client instance, pass your environment ID (available on your [account settings page](https://app.launchdarkly.com/settings#/projects)) and user context to the `LDClient.initialize` function:

        var user = {key: 'user.example.com'};
        var client = LDClient.initialize('YOUR_ENVIRONMENT_ID', user);

## Feature flags

The client will emit a `ready` event when it has been initialized. Once it has been initialized, call `variation` to access your feature flags:

        client.on('ready', function() {
          console.log("It's now safe to request feature flags");
          var showFeature = client.variation("YOUR_FEATURE_KEY", false);

          if (showFeature) {
            ...
          } else {
            ...
          }
        });


Out of the box, initializing the client will make a remote request to LaunchDarkly, so it may take approximately 100 milliseconds before the ready event is emitted. If you require feature flag values before rendering the page, we recommend bootstrapping the client. If the client is bootstrapped, it will emit the ready event immediately.

*Note*: Feature flags must marked available to the client-side SDK (see your feature flag's settings page) before they can be used in variation calls on the front-end. If you request a feature flag that is not available, you'll receive the default value for that flag.


### Bootstrapping

Bootstrapping refers to providing the LaunchDarkly client object with an initial, immediately available set of feature flag values so that on page load `variation` can be called with no delay.

#### From the server-side SDK 

The preferred approach to bootstrapping is to populate the bootstrap values (a map of feature flag keys to flag values) from your backend. LaunchDarkly's server-side SDKs have a function called `all_flags`-- this function provides the initial set of bootstrap values. You can then provide these values to your front-end as a template. Depending on your templating language, this might look something like this:

        var user = {key: 'user.example.com'};
        var client = LDClient.initialize('YOUR_ENVIRONMENT_ID', user, options = {
          bootstrap: {
            {{ ldclient.all_flags(user) }}
          }
        });

If you bootstrap from the server-side, feature flags will be ready immediately, and clients will always receive the latest feature flag values.

#### From Local Storage

Alternatively, you can bootstrap feature flags from local storage. 

        var client = LDClient.initialize('YOUR_ENVIRONMENT_ID', user, options = {
          bootstrap: 'localStorage'
        });

When using local storage, the client will store the latest flag settings in local storage. On page load, the previous settings will be used and the 'ready' event will be emitted immediately. This means that on page load, the user may see cached flag values until the next page load. 

You can still subscribe to flag changes if you're using local storage. 


### Secure mode

Secure mode ensures that feature flag settings for a user are kept private, and that one user cannot inspect the settings for another user. Secure mode works by having you include a server-generated HMAC SHA256 hash of your user key, signed with the SDK key for your environment.

You can enable secure mode for each environment on your [account settings page](https://app.launchdarkly.com/settings#/projects). You should send the computed hash for your user in the `options` array during client initialization:

        var user = {key: 'user.example.com'};
        var client = LDClient.initialize('YOUR_ENVIRONMENT_ID', user, options = {
          hash: "SERVER_GENERATED_HASH"
        });

To compute the hash, locate the SDK key for your environment on your account settings page. Then, compute an HMAC SHA256 hash of your user key, using your SDK key as a secret. Here's what this would look like in Node.js:

        var crypto = require('crypto');
        var hmac = crypto.createHmac('sha256', 'YOUR_SDK_KEY');
        hmac.update('YOUR_USER_KEY');
        hash = hmac.digest('hex');

### Listening to flag change events

The client uses an event emitter pattern to allow you to subscribe to feature flag changes in real time. To subscribe to all feature flag changes, listen for the `change` event:

        client.on('change', function(settings) {
          console.log('flags changed:', settings);
        });

The `settings` object will contain a map of updated feature flag keys and values. The map will only contain the keys to flags that have changed. You can also subscribe to specific flags:

        client.on('change:YOUR_FLAG_KEY', function(value, previous) {
          console.log('YOUR_FLAG_KEY changed:', value, '(' + previous + ')');
        });

## Events

### Click and pageview events

If you've defined [click or pageview goals](http://docs.launchdarkly.com/docs/running-an-ab-test) in LaunchDarkly, they'll be sent automatically once the client has been initialized. You do not have to do anything else with the client to send click or pageview goals.

### Custom events

You can send custom events by calling the client's `track` method. For example:

        client.track("Signed up")

### Single page apps

The SDK automatically handles URL changes (made via the HTML5 history API or by changing the URL hash fragment), and will trigger pageview and click events correctly.

## Changing the user context

You may wish to change the user context dynamically and receive the new set of feature flags for that user or generate events for the new user. For example, on a sign-in page in a single-page app, you may initialize the client with an anonymous user. When the user logs in, you'd want the feature flag settings for the authenticated user. To do this, you can call the `identify` function:

        client.identify(newUser, hash, function() {
          console.log("New user's flags available");
        });

The `hash` parameter is the hash for the new user, assuming that the user's key has changed. It is only required in secure mode-- if secure mode is not enabled, you can pass in `null` for the hash.


## Development information

To build the module, run `npm run build`. You can also run `npm run watch` to rebuild the module automatically on file change.

To run the tests, run `npm run test`.


