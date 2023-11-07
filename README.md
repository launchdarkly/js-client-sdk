# LaunchDarkly SDK for Browser JavaScript

[![Circle CI](https://circleci.com/gh/launchdarkly/js-client-sdk/tree/main.svg?style=svg)](https://circleci.com/gh/launchdarkly/js-client-sdk/tree/main)

## LaunchDarkly overview

[LaunchDarkly](https://www.launchdarkly.com) is a feature management platform that serves trillions of feature flags daily to help teams build better software, faster. [Get started](https://docs.launchdarkly.com/home/getting-started) using LaunchDarkly today!

[![Twitter Follow](https://img.shields.io/twitter/follow/launchdarkly.svg?style=social&label=Follow&maxAge=2592000)](https://twitter.com/intent/follow?screen_name=launchdarkly)

## Getting started

Refer to the [SDK documentation](https://docs.launchdarkly.com/sdk/client-side/javascript#getting-started) for instructions on getting started with using the SDK.

Note: _If you are using JavaScript in a non-browser environment,_ please see our [server-side Node.js SDK](https://github.com/launchdarkly/node-server-sdk), [client-side Node.js SDK](https://github.com/launchdarkly/node-client-sdk), and [Electron SDK](https://github.com/launchdarkly/electron-client-sdk).

Please note that the JavaScript SDK has two special requirements in terms of your LaunchDarkly environment. First, in terms of the credentials for your environment that appear on your [Account Settings](https://app.launchdarkly.com/settings/projects) dashboard, the JavaScript SDK uses the "Client-side ID"-- not the "SDK key" or the "Mobile key". Second, for any feature flag that you will be using in JavaScript code, you must check the "Make this flag available to client-side SDKs" box on that flag's Settings page.

## ReactJS

The SDK does not require any particular JavaScript framework. However, if you are using [React](https://reactjs.org/), there is an add-on to simplify use of the SDK. See [`react-client-sdk`](https://github.com/launchdarkly/react-client-sdk).

## Browser compatibility

The LaunchDarkly SDK can be used in all major browsers. However, web browsers vary widely in their support of specific features and standards. Three features that are used by the LaunchDarkly SDK that may not be available on every browser are `Promise`, `EventSource`, and `document.querySelectorAll()`. For more information on whether you may need to use a polyfill to ensure compatibility, and how to do so, see ["JS SDK requirements and polyfills"](https://docs.launchdarkly.com/sdk/client-side/javascript/requirements-polyfills).

## Logging

By default, the SDK sends log output to the browser console. There are four logging levels: `debug`, `info`, `warn`, and `error`; by default, `debug` and `info` messages are hidden. See [`LDOptions.logger`](https://launchdarkly.github.io/js-client-sdk/interfaces/LDOptions.html#logger) and [`basicLogger`](https://launchdarkly.github.io/js-client-sdk/functions/basicLogger.html) for more details.

## Learn more

Read our [documentation](https://docs.launchdarkly.com) for in-depth instructions on configuring and using LaunchDarkly. You can also head straight to the [complete reference guide for this SDK](https://docs.launchdarkly.com/sdk/client-side/javascript). Additionally, the authoritative full description of all properties, types, and methods is the [online TypeScript documentation](https://launchdarkly.github.io/js-client-sdk/). If you are not using TypeScript, then the types are only for your information and are not enforced, although the properties and methods are still the same as described in the documentation.

For examples of using the SDK in a simple JavaScript application, see [`hello-js`](https://github.com/launchdarkly/hello-js) and [`hello-bootstrap`](https://github.com/launchdarkly/hello-bootstrap).

## Testing

We run integration tests for all our SDKs using a centralized test harness. This approach gives us the ability to test for consistency across SDKs, as well as test networking behavior in a long-running application. These tests cover each method in the SDK, and verify that event sending, flag evaluation, stream reconnection, and other aspects of the SDK all behave correctly.

## Contributing

We encourage pull requests and other contributions from the community. Check out our [contributing guidelines](CONTRIBUTING.md) for instructions on how to contribute to this SDK.

## About LaunchDarkly

* LaunchDarkly is a continuous delivery platform that provides feature flags as a service and allows developers to iterate quickly and safely. We allow you to easily flag your features and manage them from the LaunchDarkly dashboard.  With LaunchDarkly, you can:
    * Roll out a new feature to a subset of your users (like a group of users who opt-in to a beta tester group), gathering feedback and bug reports from real-world use cases.
    * Gradually roll out a feature to an increasing percentage of users, and track the effect that the feature has on key metrics (for instance, how likely is a user to complete a purchase if they have feature A versus feature B?).
    * Turn off a feature that you realize is causing performance problems in production, without needing to re-deploy, or even restart the application with a changed configuration file.
    * Grant access to certain features based on user attributes, like payment plan (eg: users on the ‘gold’ plan get access to more features than users in the ‘silver’ plan). Disable parts of your application to facilitate maintenance, without taking everything offline.
* LaunchDarkly provides feature flag SDKs for a wide variety of languages and technologies. Check out [our documentation](https://docs.launchdarkly.com/sdk) for a complete list.
* Explore LaunchDarkly
    * [launchdarkly.com](https://www.launchdarkly.com/ "LaunchDarkly Main Website") for more information
    * [docs.launchdarkly.com](https://docs.launchdarkly.com/  "LaunchDarkly Documentation") for our documentation and SDK reference guides
    * [apidocs.launchdarkly.com](https://apidocs.launchdarkly.com/  "LaunchDarkly API Documentation") for our API documentation
    * [blog.launchdarkly.com](https://blog.launchdarkly.com/  "LaunchDarkly Blog Documentation") for the latest product updates
