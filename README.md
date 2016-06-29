# LaunchDarkly SDK for Client-Side JavaScript

## Installation

There are two ways to install the client-side SDK:

1. Via the `npm` package:

        npm install --save ldclient-js

2. A minimized version of the script is also hosted on `npmcdn`, and can be included via a `script` tag:

        <script src="https://npmcdn.com/ldclient-js/dist/client.min.js">

## Usage

### Basics

To create a client instance, pass your environment ID (available on your [account settings page](https://app.launchdarkly.com/settings#/projects)) and user context to the `LDClient.initialize` function:

        var user = {key: 'user.example.com'};
        var client = LDClient.initialize('YOUR_ENVIRONMENT_ID', user);

The client will emit a `ready` event when it has been initialized. Once it has been initialized, call `toggle` or `variation` to access your feature flags:

        client.on('ready', function() {
          console.log("It's now safe to request feature flags");
          var showFeature = client.toggle("YOUR_FEATURE_KEY", false);

          if (showFeature) {
            ...
          } else {
            ...
          }
        });

Note that out of the box, initializing the client will make a remote request to LaunchDarkly, so it may take several milliseconds before the ready event is emitted. If you require feature flag values before rendering the page, we recommend bootstrapping the client. If the client is bootstrapped, it will emit the ready event immediately.

### Bootstrapping

Bootstrapping refers to providing the LaunchDarkly client object with an initial, immediately available set of feature flag values so that on page load `toggle` or `variation` can be called with no delay.

The preferred approach to bootstrapping is to populate the bootstrap values (a map of feature flag keys to flag values) from your backend. LaunchDarkly's server-side SDKs have a function called `all_flags`-- this function provides the initial set of bootstrap values. You can then provide these values to your front-end as a template. Depending on your templating language, this might look something like this:

        var user = {key: 'user.example.com'};
        var client = window.ld = LDClient.initialize('YOUR_ENVIRONMENT_ID', user, options = {
          bootstrap: {
            {{ ldclient.all_flags(user) }}
          }
        });

### Secure mode

Secure mode ensures that feature flag settings for a user are kept private, and that one user cannot inspect the settings for another user. Secure mode works by having you include a server-generated HMAC SHA256 hash of your user key, signed with the SDK key for your environment.

You can enable secure mode for each environment on your [account settings page](https://app.launchdarkly.com/settings#/projects). You should send the computed hash for your user in the `options` array during client initialization:

        var user = {key: 'user.example.com'};
        var client = window.ld = LDClient.initialize('YOUR_ENVIRONMENT_ID', user, options = {
          hash: "SERVER_GENERATED_HASH"
        });

To compute the hash, locate the SDK key for your environment on your account settings page. Then, compute an HMAC SHA256 hash of your user key, using your SDK key as a secret. Here's what this would look like in Node.js:

        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', 'YOUR_SDK_KEY');
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

### Changing the user context

You may wish to change the user context dynamically and receive the new set of feature flags for that user. For example, on a sign-in page in a single-page app, you may initialize the client with an anonymous user. When the user logs in, you'd want the feature flag settings for the authenticated user. To do this, you can call the `identify` function:

        client.identify(newUser, hash, function() {
          console.log("New user's flags available");
        });

The `hash` parameter is the hash for the new user, assuming that the user's key has changed. It is only required in secure mode-- if secure mode is not enabled, you can pass in `null` for the hash.
