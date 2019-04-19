# Change log

All notable changes to the LaunchDarkly client-side JavaScript SDKs will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org).

## [2.10.0] - 2019-04-19
### Added:
- Generated TypeDoc documentation for all types, properties, and methods is now available online at [https://launchdarkly.github.io/js-client/](https://launchdarkly.github.io/js-client/). Currently this will only be for the latest released version.
- The SDK now allows you to specify an anonymous user without a key (i.e. the `anonymous` property is `true`, and there is no `key` property). In that case, the SDK will generate a UUID and send that as the user key. It will also cache this generated key in local storage (if local storage is available) so that anonymous users in the same browser will always get the same key.

### Fixed:
- Setting user attributes to non-string values when a string was expected would prevent evaluations and analytics events from working. The SDK will now convert attribute values to strings as needed.

## [2.9.7] - 2019-04-16
### Fixed:
- If there are pending analytics events when the page is being closed, the SDK normally attempts to deliver them by making a synchronous HTTP request. Chrome, as of version 73, does not allow this and logs an error. An upcoming release will change how events are sent, but as a temporary measure to avoid these errors, the SDK will now simply discard any pending events when the page is being closed _if_ the browser is Chrome version 73 or higher. In other browsers, there is no change. Note that this means that in Chrome 73, some events may be lost; that was already the case. The purpose of this patch is simply to avoid triggering errors. ([#178](https://github.com/launchdarkly/js-client-private/pull/178))

## [2.9.6] - 2019-04-16

This release was an error and has been removed.

## [2.9.5] - 2019-03-12
### Fixed:
- In React, when using the `bootstrap` property to preload the SDK client with flag values, the client will now become ready immediately and make the flags available to other components as soon as it is initialized; previously this did not happen until after `componentDidMount`.
- The user attribute `secondary` was not included in the TypeScript declarations and therefore could not be used from TypeScript code.

## [2.9.4] - 2019-02-22
### Fixed:
- Running inside an iframe on Chrome with third-party cookies disabled-- which also disables HTML5 local storage-- would cause a security exception (due to the SDK attempting to check whether `window.localStorage` exists). This was a long-standing problem, but became worse in the 2.9.0 release since the SDK now checks for browser capabilities like this regardless of whether you've attempted to use them yet. It should now simply log a warning if you try to use `bootstrap: "localstorage"` when local storage is disabled. ([#138](https://github.com/launchdarkly/js-client/issues/138))
- If the SDK received streaming updates out of order (rare, but possible) such that it received "flag X was deleted" prior to "flag X was created", an uncaught exception would be logged in the browser console (but would not otherwise affect anything).
- A supported user property, `privateAttributeNames`, was not usable from TypeScript because it was omitted from the TypeScript declarations.
- Several TypeScript declarations had been changed from `interface` to `type`. They all now use `interface`, except for `LDFlagValue` which is a type alias. This should not affect regular usage of the SDK in TypeScript, but it is easier to extend an `interface` than a `type` if desired.
- Removed a window message listener that was previously used for integration with the LaunchDarkly dashboard, but is no longer used.

## [2.9.3] - 2019-02-12
### Fixed:
- The React SDK was pulling in the entire `lodash` package. This has been improved to only require the much smaller `camelcase` tool from `lodash`.
- The React SDK now lists React itself as a peer dependency rather than a regular dependency, so it will not included twice in an application that already requires React.
- Corrected the TypeScript declaration for the `identify` method to indicate that its asynchronous result type is `LDFlagSet`, not `void`. (Thanks, [impressiver](https://github.com/launchdarkly/js-client/pull/135)!)
- Corrected and expanded many documentation comments in the TypeScript declarations.

(The 2.9.2 release was broken and has been removed.)

## [2.9.1] - 2019-02-08
### Fixed:
- The previous release of `ldclient-react` was broken: the package did not contain the actual files. The packaging script has been fixed. There are no other changes.

## [2.9.0] - 2019-02-01
### Added:
- The new [`ldclient-react`](packages/ldclient-react/README.md) package provides a convenient mechanism for using the LaunchDarkly SDK within the React framework.
- The new `getUser()` method returns the current user object.
- The client options can now have a `logger` property that defines a custom logging mechanism. The default is still to use `console.warn` and `console.error`; you could override this to send log messages to another destination or to suppress them. See `LDLogger` and `createConsoleLogger` in the [TypeScript definitions](packages/ldclient-js-common/typings.d.ts).

### Changed:
- The SDK now uses an additional package, `ldclient-js-common`, consisting of code that is also used by other LaunchDarkly SDKs. This is automatically loaded as a dependency of `ldclient-js` so you should notice any difference. However, the source code has been reorganized so that this project is now a monorepo containing multiple packages.

## [2.8.0] - 2018-12-03
### Added:
- The use of a streaming connection to LaunchDarkly for receiving live updates can now be controlled with the new `client.setStreaming()` method, or the equivalent boolean `streaming` property in the client configuration. If you set this to `false`, the client will not open a streaming connection even if you subscribe to change events (you might want to do this if, for instance, you just want to be notified when the client gets new flag values due to having switched users). If you set it to `true`, the client will open a streaming connection regardless of whether you subscribe to change events or not (the flag values will simply be updated in the background). If you don't set it either way then the default behavior still applies, i.e. the client opens a streaming connection if and only if you subscribe to change events.

### Fixed:
- If the client opened a streaming connection because you called `on('change', ...)` one or more times, it will not close the connection until you call `off()` for _all_ of your event listeners. Previously, it was closing the connection whenever `off('change')` was called, even if you still had a listener for `'change:specific-flag-key'`.
- The client's logic for signaling a `change` event was using a regular Javascript `===` comparison, so it could incorrectly decide that a flag had changed if its value was a JSON object or an array. This has been fixed to use deep equality checking for object and array values.

## [2.7.5] - 2018-11-21
### Fixed:
- When using the [`event-source-polyfill`](https://github.com/Yaffle/EventSource) package to allow streaming mode in browsers with no native EventSource support, the polyfill was using a default read timeout of 45 seconds, so if no updates arrived within 45 seconds it would log an error and reconnect the stream. The SDK now sets its own timeout (5 minutes) which will be used if this particular polyfill is active. LaunchDarkly normally sends a heartbeat every 3 minutes, so you should not see a timeout happen unless the connection has been lost.
- The SDK's use of the "Base64" package caused problems for build tools that strictly enforce the lowercase package name rule. It now uses the "base64-js" package instead. ([#124](https://github.com/launchdarkly/js-client/issues/124))

## [2.7.4] - 2018-11-21
(This version was skipped due to a release problem.)

## [2.7.3] - 2018-11-09
### Fixed:
- The TypeScript definitions were incorrectly restricting the possible values for event types in `on()` and `off()`. Also, added documentation for event types which were not documented before. ([#122](https://github.com/launchdarkly/js-client/issues/122))

## [2.7.2] - 2018-10-17
### Fixed:
- Disconnecting from the stream does not close the browser tab anymore. 
(Thanks, [Sawtaytoes](https://github.com/launchdarkly/js-client/issues/119).)
- The configuration property `evaluationReasons` was misnamed as `evaluationExplanations` in the TypeScript definitions.

## [2.7.1] - 2018-09-27
### Fixed:
- Event posts did not include the HTTP header that specifies the SDK version. They now do again. Note that the `sendLDHeaders` option does not affect this; if the header is turned off for flag requests, it should still be sent in events, since events always require a CORS preflight check anyway (and are delivered asynchronously, so the OPTIONS request does not slow down page loads).

## [2.7.0] - 2018-09-26
### Added:
- New client method `waitForInitialization` returns a Promise, like `waitUntilReady`; but while `waitUntilReady` will be resolved as soon as client initialization either succeeds or fails, `waitForInitialization` will be resolved only if initialization succeeds, and will be rejected (with an error object) if it fails.
- New config option `fetchGoals` (default: true) allows you to control whether the client will request A/B testing parameters from LaunchDarkly. If you do not use A/B testing, you may wish to disable this to reduce the number of HTTP requests.
- New config option `sendLDHeaders` (default: true) allows you to control whether the client will add a custom HTTP header to LaunchDarkly flag requests (to indicate the SDK version). You may wish to disable this behavior if you have performance concerns, as it causes browsers to make an additional CORS preflight check (since it is no longer a [simple request](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)).

## [2.6.0] - 2018-09-07
### Added:
- The new configuration option `evaluationReasons` causes LaunchDarkly to report information about how each feature flag value was determined; you can access this information with the new client method `variationDetail`. The new method returns an object that contains both the flag value and a "reason" object which will tell you, for instance, if the user was individually targeted for the flag or was matched by one of the flag's rules, or if the flag returned the default value due to an error.

### Changed:
- In streaming mode, the client will attempt to reconnect if it receives an HTTP error status from LaunchDarkly. Previously, it would only retry if the connection was lost.

## [2.5.0] - 2018-08-27
### Changed:
- Starting in version 2.0.0, there was a problem where analytics events would not be generated correctly if you initialized the client with bootstrap data, because the bootstrap data did not include some flag metadata that the front end uses for events. The client now supports an extended format for bootstrap data that fixes this problem; this is generated by calling a new method that has been added to the server-side SDKs, `allFlagsState`/`all_flags_state` (previously `allFlags`/`all_flags`). Therefore, if you want analytics event data and you are using bootstrap data from the back end, you should upgrade both your JavaScript SDK and your server-side SDK, and use `allFlagsState` on the back end. This does not require any changes in your JavaScript code. If you use bootstrap data in the old format, the SDK will still be usable but events will not work correctly.
- When posting events to LaunchDarkly, if a request fails, it will be retried once.
- The TypeScript mappings for the SDK were omitted from the distribution in the previous release. They are now in the distribution again, in the root folder instead of in `src`, and have been renamed from `index.d.ts` to `typings.d.ts`.

## [2.4.1] - 2018-08-14
### Fixed:
- The result value of `identify()` (provided by either a promise or a callback, once the flag values for the new user have been retrieved) used to be a simple map of flag keys to values, until it was accidentally changed to an internal data structure in version 2.0.0. It is now a map of flag keys to values again, consistent with what is returned by `allFlags()`.
- Added TypeScript definitions for the result values of `identify()`. (Thanks, [1999](https://github.com/launchdarkly/js-client/pull/102)!)
- Documented all optional compatibility polyfills in `README.md`.

## [2.4.0] - 2018-07-12
### Added:
- Named exports for the `initialize` method and `version` number exports.

### Deprecated:
- Default exports, use named exports instead.

### Changed:
- Updated `package.json` to only export minified files.

## [2.3.1] - 2018-06-29
### Fixed:
- If a polling request has failed due to an invalid environment key, calling `variation` now returns the default value; previously, it sometimes caused a null reference error.

## [2.3.0] - 2018-06-26
### Changed:
- The client will now stop trying to send analytics events if it receives almost any HTTP 4xx error from LaunchDarkly; such errors indicate either a configuration problem (invalid SDK key) or a bug, which is not likely to resolve without a restart or an upgrade. This does not apply if the error is 400, 408, or 429.

## [2.2.0] - 2018-06-22
### Added:
- New event `goalsReady` (and new method `waitUntilGoalsReady`, which returns a Promise based on that event) indicates when the client has loaded goals-- i.e. when it is possible for pageview events and click events to be triggered.

### Fixed:
- Fixed a bug where calling `variation` would throw an error if the client was bootstrapped from local storage and there were no flags in local storage yet, and the initial HTTP request for flags from LaunchDarkly had not yet completed. (thanks, [mpcowan](https://github.com/launchdarkly/js-client/pull/97)!)

## [2.1.2] - 2018-06-08
### Fixed:
- Fix the TypeScript definitions to properly support the ES default export.

## [2.1.1] - 2018-06-05
### Fixed:
- Removed two function calls that are not supported in Internet Explorer: `string.startsWith()` and `Object.assign()`.

## [2.1.0] - 2018-05-31
### Added:
- The client now sends the current SDK version to LaunchDarkly in an HTTP header. This information will be visible in a future version of the LaunchDarkly UI.

### Fixed:
- Fixed a bug that caused summary events to combine the counts for flag evaluations that produced the flag's first variation (variation index 0) with the counts for flag evaluations that fell through to the default value.

## [2.0.0] - 2018-05-25
### Changed
- To reduce the network bandwidth used for analytics events, feature request events are now sent as counters rather than individual events, and user details are now sent only at intervals rather than in each event. These behaviors can be modified through the LaunchDarkly UI and with the new configuration option `inlineUsersInEvents`. For more details, see [Analytics Data Stream Reference](https://docs.launchdarkly.com/v2.0/docs/analytics-data-stream-reference).
- In every function that takes an optional callback parameter, if you provide a callback, the function will not return a promise; a promise will be returned only if you omit the callback. Previously, it would always return a promise which would be resolved/rejected at the same time that the callback (if any) was called; this caused problems if you had not registered an error handler for the promise.
- When sending analytics events, if there is a connection error or an HTTP 5xx response, the client will try to send the events again one more time after a one-second delay.
- Analytics are now sent with an HTTP `POST` request if the browser supports CORS, or via image loading if it does not. Previously, they were always sent via image loading.

### Added
- The new configuration option `sendEventsOnlyForVariation`, if set to `true`, causes analytics events for feature flags to be sent only when you call `variation`. Otherwise, the default behavior is to also send events when you call `allFlags`, and whenever a changed flag value is detected in streaming mode.
- The new configuration option `allowFrequentDuplicateEvents`, if set to `true`, turns off throttling for feature flag events. Otherwise, the default behavior is to block the sending of an analytics event if another event with the same flag key, flag value, and user key was generated within the last five minutes.

### Fixed
- If `identify` is called with a null user, or a user with no key, the function no longer tries to do an HTTP request to the server (which would always fail); instead, it just returns an error.

### Deprecated
- The configuration options `all_attributes_private` and `private_attribute_names` are deprecated. Use `allAttributesPrivate` and `privateAttributeNames` instead.

## [1.7.4] - 2018-05-23
### Fixed
- Fixed a bug that caused events _not_ to be sent if `options.sendEvents` was explicitly set to `true`.
- HTTP requests will no longer fail if there is a `charset` specified in the response's `Content-Type` header. ([#87](https://github.com/launchdarkly/js-client/issues/87))

## [1.7.3] - 2018-05-08
### Fixed
- The client no longer creates an empty `XMLHttpRequest` at startup time (which could interfere with unit tests).

## [1.7.2] - 2018-05-07
_This release was broken and should not be used._

## [1.7.1] - 2018-05-07
_This release was broken and should not be used._

## [1.7.0] - 2018-04-27
### Changed
- The build now uses Rollup, Babel and Jest.
### Fixed
- Fixed a bug that caused a syntax error when running in Internet Explorer 11.
- Fixed an IE 11 incompatibility in the example page index.html.
- Fixed a bug that caused the SDK to send events on beforeunload even if it should not send events.


## [1.6.2] - 2018-04-05

### Fixed

* `LDClient.track` properly sets the user for custom events.

## [1.6.1] - 2018-03-30

### Fixed

* The SDK now polls the URL for changes if (and only if) there are page view goals,to ensure it is accurately reporting page views.

## [1.6.0] - 2018-03-28

### Changed

* Added support for a future update to LaunchDarkly that will deliver individual feature flag changes over the streaming connection as they occur, rather than requiring the client to re-request all flags for each change.

## [1.5.2] - 2018-03-28

### Added

* The new flush method on the client object tells the client to deliver any stored analytics events as soon as possible, rather than waiting for the regularly scheduled event-flushing interval.
  ### Fixed
* Fixed a bug that could prevent events from being generated for page view goals.

## [1.5.1] - 2018-03-07

### Fixed

* Removed usage of the `const` keyword, to maintain IE10 compatibility. (Thanks, [turnerniles](https://github.com/launchdarkly/js-client/pull/68)!)

## [1.5.0] - 2018-03-05

### Added

* The `options` object now supports a `samplingInterval` property. If greater than zero, this causes a fraction of analytics events to be sent to LaunchDarkly: one per that number of events (pseudo-randomly). For instance, setting it to 5 would cause 20% of events to be sent on average.

## [1.4.0] - 2018-02-07

### Added

* The SDK now supports multiple environments. Calling `initialize` returns a new client each time.
  ### Fixed
* The `waitUntilReady` `Promise` will now resolve even after the `ready` event was emitted — thanks @rmanalan!

## [1.3.1] - 2018-01-23

### Fixed

* Methods that expose a `Promise` interface now properly return the resolution or rejection value to the caller.

## [1.3.0] - 2018-01-22

### Added

* Support for [private user attributes](https://docs.launchdarkly.com/docs/private-user-attributes).
* New `sendEvents` option to control whether the SDK should send events back to LaunchDarkly or not. Defaults to `true`.
* It is now possible to wait for SDK readiness using `waitUntilReady` which returns a `Promise`. `identify` also returns a `Promise` (while still supporting the callback argument), which should make
  it easier to integrate into code that relies heavily on `Promise`'s for asynchronous code.
  ### Changed
* The SDK now respects the user's [do-not-track setting](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/doNotTrack)

## [1.2.0] - 2017-12-15

### Added

* Added `useReport` initialization option to use `REPORT` instead of `GET` when communicating with LaunchDarkly.
  ### Fixed
* Authentication errors will now be logged — the root cause for these errors is usually an invalid
  client-side ID.

## [1.1.13] - 2017-12-12

### Changed

* Emit an `error` event — separately from the `ready` event — in case fetching initial data fails. This allows consumers to respond accordingly.

## [1.1.12] - 2017-06-09

### Changed

* Improve error handling

## [1.1.11] - 2017-05-16

### Added

* Add typescript definitions

## [1.1.10] - 2017-05-04

### Added

* Add a warning when tracking unknown custom goal events

## [1.1.9] - 2017-04-07

### Fixed

* Changed default stream url

## [1.1.8] - 2017-02-02

### Fixed

* Cached `localStorage` copy is not overwritten anymore when connection to LD
  fails

## [1.1.7] - 2017-01-27

### Changed

* `onDone` argument to `identify` method is now optional

## [1.1.6] - 2017-01-16

### Changed

* Removed dependency on Sizzle and direct to polyfill for older browser support

## [1.1.5] - 2016-12-07

### Changed

* Fix bug in `Emitter.off()`

## [1.1.4] - 2016-10-26

### Changed

* Fix bug caused by accessing `undefined` flags

## [1.1.3] - 2016-10-14

### Changed

* Fix bug caused by accessing `undefined` settings

## [1.1.2] - 2016-09-21

### Changed

* Ensure callbacks only ever get called once

## [1.1.1] - 2016-09-20

### Changed

* Fix flag setting request cancellation logic

## [1.1.0] - 2016-09-14

### Added

* Add a new `allFlags` method that returns a map of all feature flag keys and
  their values for a user

## [1.0.8] - 2016-09-09

### Changed

* Added 'undefined' check on VERSION otherwise unbundled usage from npm fails

## [1.0.7] - 2016-09-06

### Changed

* Expose SDK version at `LDClient.version`

## [1.0.6] - 2016-08-23

### Changed

* Added check for EventSource before trying to connect Stream.

## [1.0.5] - 2016-08-22

### Changed

* Fixed an error that occurred on `hashchage`/`popstate` if the account had no
  goals.

## [1.0.4] - 2016-08-12

### Changed

* Added window check for server side rendering compatibility before loading
  Sizzle.
