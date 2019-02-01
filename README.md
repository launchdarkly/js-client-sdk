# LaunchDarkly SDK for Browser JavaScript

[![Circle CI](https://circleci.com/gh/launchdarkly/js-client/tree/master.svg?style=svg)](https://circleci.com/gh/launchdarkly/js-client/tree/master)

## Introduction

This is the official LaunchDarkly JavaScript SDK for web browser applications. It provides the same functionality as all of the LaunchDarkly SDKs:

* Making feature flags available to your JavaScript code.
* Sending events to LaunchDarkly for analytics and/or A/B testing.
* Optionally maintaining a streaming connection to LaunchDarkly for immediate notification of any feature flag changes.

There are two main packages in the SDK. Their functionality is described in detail in their own README files, linked below.

* `ldclient-js`: The full SDK client. [Details here](packages/ldclient-js/README.md)
* `ldclient-react`: A wrapper around `ldclient-js` providing an alternate API for React applications. [Details here](packages/ldclient-react/README.md)

The rest of this file contains information that applies equally to both of these packages.

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

## Your LaunchDarkly environment

The JavaScript SDK does not use the SDK key that the server-side SDKs use, since an end user who acquired that key could use it to access the details of your LaunchDarkly environment. Instead, it uses the "client-side ID" associated with your environment.

Note that in order for LaunchDarkly to make your feature flags available to the SDK, you must check the "Make this flag available to client-side SDKs" box on the Settings page for each flag. This is so that if you have a web application with a large number of flags used on the server side and a smaller number used on the front end, the JavaScript SDK can save bandwidth by only getting the subset of flags that it will use.

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
