# LaunchDarkly SDK for Client-Side JavaScript

## Introduction

This is the official LaunchDarkly client-side JavaScript SDK. This SDK does two things:

* Makes feature flags available to your client-side (front-end) JavaScript code.
* Sends click, pageview, and custom events from your front-end for A/B tests and analytics.

## Browser Support

The LaunchDarkly client-side JavaScript SDK supports the following browsers:

* Chrome (any recent)
* Firefox (any recent)
* Safari (any recent)*
* Internet Explorer (IE10+)*
* Edge (any recent)*
* Opera (any recent)*

\* These browsers do not support streaming new flags to connected clients, even when `client.on('change')` is called.

### EventSource polyfill

If you need streaming support, and you wish to support browsers that do not support `EventSource` natively, you can install a polyfill, such
as [EventSource](https://github.com/Yaffle/EventSource).

You can load the polyfill via a script tag in the `<head>` before the script where you initialize `LDClient`:

    <script src="/public/eventsource.js"></script>

If you use [webpack](https://webpack.github.io/) or [browserify](http://browserify.org/), make sure to require the polyfill before `LDClient` is initialized.

### Document.querySelectorAll() polyfill

If you need to run A/B tests on IE7 or IE8 you will need to install a polyfill for `document.querySelector()` such as [polyfill-queryselector](https://github.com/cobbdb/polyfill-queryselector).

You can load the polyfll via a script tag in the `<head>`:

    <script src="/public/querySelector.js"></script>

You can also install it with `npm install polyfill-queryselector` or `bower install polyfill-queryselector`.

## Installation

There are two ways to install the client-side SDK:

1. Via the `npm` package:

        npm install --save ldclient-js

2. A minimized version of the script is also hosted on our CDN, and can be included via a `script` tag:

        <script src="https://app.launchdarkly.com/snippet/ldclient.min.js">

## Basics

To create a client instance, pass your environment's client-side ID (available on your [account settings page](https://app.launchdarkly.com/settings#/projects)) and user context to the `LDClient.initialize` function:

        var user = {key: 'user.example.com'};
        var client = LDClient.initialize('YOUR_CLIENT_SIDE_ID', user);

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

You can also fetch all feature flags for a user:


          var flags = client.allFlags();

This will return a key / value map of all your feature flags. The map will contain `null` values for any flags that would return the fallback value (the second argument that you normally pass to `variation`). Note that this will send analytics events to LaunchDarkly as if you'd called `variation` for every feature flag.

### Bootstrapping

Bootstrapping refers to providing the LaunchDarkly client object with an initial, immediately available set of feature flag values so that on page load `variation` can be called with no delay.

#### From the server-side SDK

The preferred approach to bootstrapping is to populate the bootstrap values (a map of feature flag keys to flag values) from your backend. LaunchDarkly's server-side SDKs have a function called `allFlags`-- this function provides the initial set of bootstrap values. You can then provide these values to your front-end as a template. Depending on your templating language, this might look something like this:

        var user = {key: 'user.example.com'};
        var client = LDClient.initialize('YOUR_CLIENT_SIDE_ID', user, options = {
          bootstrap: {
            {{ ldclient.all_flags(user) }}
          }
        });

If you bootstrap from the server-side, feature flags will be ready immediately, and clients will always receive the latest feature flag values.

#### From Local Storage

Alternatively, you can bootstrap feature flags from local storage.

        var client = LDClient.initialize('YOUR_CLIENT_SIDE_ID', user, options = {
          bootstrap: 'localStorage'
        });

When using local storage, the client will store the latest flag settings in local storage. On page load, the previous settings will be used and the 'ready' event will be emitted immediately. This means that on page load, the user may see cached flag values until the next page load.

You can still subscribe to flag changes if you're using local storage.


### Secure mode

Secure mode ensures that feature flag settings for a user are kept private, and that one user cannot inspect the settings for another user. Secure mode works by having you include a server-generated HMAC SHA256 hash of your user key, signed with the SDK key for your environment.

You can enable secure mode for each environment on your [account settings page](https://app.launchdarkly.com/settings#/projects). You should send the computed hash for your user in the `options` array during client initialization:

        var user = {key: 'user.example.com'};
        var client = LDClient.initialize('YOUR_CLIENT_SIDE_ID', user, options = {
          hash: "SERVER_GENERATED_HASH"
        });

Each of our server-side SDKs includes a method to compute the secure mode hash for a user. You can pass this to your front-end code in a template. For example:

        var client = LDClient.initialize('YOUR_CLIENT_SIDE_ID', user, options = {
                hash: {{ ldclient.secure_mode_hash(user) }} // this is a template directive, and the ldclient instance here is your server-side SDK client
        });


To compute the hash yourself, locate the SDK key for your environment on your account settings page. Then, compute an HMAC SHA256 hash of your user key, using your SDK key as a secret. Here's what this would look like in Node.js:

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

If you've defined [click or pageview goals](https://docs.launchdarkly.com/docs/running-ab-tests) in LaunchDarkly, they'll be sent automatically once the client has been initialized. You do not have to do anything else with the client to send click or pageview goals.

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

To build the module, first run `npm install`. Then run `npm run build`. You can also run `npm run watch` to rebuild the module automatically on file change.

To run the tests, run `npm run test`.


About LaunchDarkly
-----------

* LaunchDarkly is a continuous delivery platform that provides feature flags as a service and allows developers to iterate quickly and safely. We allow you to easily flag your features and manage them from the LaunchDarkly dashboard.  With LaunchDarkly, you can:
    * Roll out a new feature to a subset of your users (like a group of users who opt-in to a beta tester group), gathering feedback and bug reports from real-world use cases.
    * Gradually roll out a feature to an increasing percentage of users, and track the effect that the feature has on key metrics (for instance, how likely is a user to complete a purchase if they have feature A versus feature B?).
    * Turn off a feature that you realize is causing performance problems in production, without needing to re-deploy, or even restart the application with a changed configuration file.
    * Grant access to certain features based on user attributes, like payment plan (eg: users on the ‘gold’ plan get access to more features than users in the ‘silver’ plan). Disable parts of your application to facilitate maintenance, without taking everything offline.
* LaunchDarkly provides feature flag SDKs for
    * [Java](http://docs.launchdarkly.com/docs/java-sdk-reference "Java SDK")
    * [JavaScript](http://docs.launchdarkly.com/docs/js-sdk-reference "LaunchDarkly JavaScript SDK")
    * [PHP](http://docs.launchdarkly.com/docs/php-sdk-reference "LaunchDarkly PHP SDK")
    * [Python](http://docs.launchdarkly.com/docs/python-sdk-reference "LaunchDarkly Python SDK")
    * [Python Twisted](http://docs.launchdarkly.com/docs/python-twisted-sdk-reference "LaunchDarkly Python Twisted SDK")
    * [Go](http://docs.launchdarkly.com/docs/go-sdk-reference "LaunchDarkly Go SDK")
    * [Node.JS](http://docs.launchdarkly.com/docs/node-sdk-reference "LaunchDarkly Node SDK")
    * [.NET](http://docs.launchdarkly.com/docs/dotnet-sdk-reference "LaunchDarkly .Net SDK")
    * [Ruby](http://docs.launchdarkly.com/docs/ruby-sdk-reference "LaunchDarkly Ruby SDK")
    * [iOS](http://docs.launchdarkly.com/docs/ios-sdk-reference "LaunchDarkly iOS SDK")
    * [Android](http://docs.launchdarkly.com/docs/android-sdk-reference "LaunchDarkly Android SDK")
* Explore LaunchDarkly
    * [launchdarkly.com](http://www.launchdarkly.com/ "LaunchDarkly Main Website") for more information
    * [docs.launchdarkly.com](http://docs.launchdarkly.com/  "LaunchDarkly Documentation") for our documentation and SDKs
    * [apidocs.launchdarkly.com](http://apidocs.launchdarkly.com/  "LaunchDarkly API Documentation") for our API documentation
    * [blog.launchdarkly.com](http://blog.launchdarkly.com/  "LaunchDarkly Blog Documentation") for the latest product updates
    * [Feature Flagging Guide](https://github.com/launchdarkly/featureflags/  "Feature Flagging Guide") for best practices and strategies
