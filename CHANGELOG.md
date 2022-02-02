# Change log

All notable changes to the LaunchDarkly client-side JavaScript SDKs will be documented in this file. This project adheres to [Semantic Versioning](http://semver.org).

## [2.20.1] - 2022-02-02
### Fixed:
- If the browser local storage mechanism throws an exception (for instance, if it is disabled or if storage is full), the SDK now correctly catches the exception and logs a message about the failure. It will only log this message once during the lifetime of the SDK client. ([#54](https://github.com/launchdarkly/js-sdk-common/issues/54))

## [2.20.0] - 2021-10-15
### Added:
- New property `LDOptions.requestHeaderTransform` allows custom headers to be added to all HTTP requests. This may be necessary if you have an Internet gateway that uses a custom header for authentication. Note that custom headers may cause cross-origin browser requests to be rejected unless you have a way to ensure that the header name also appears in `Access-Control-Allow-Headers` for CORS preflight responses; if you are connecting to the LaunchDarkly Relay Proxy, it has a way to configure this.

## [2.19.4] - 2021-10-12
### Fixed:
- Removed an obsolete warning that would appear in the browser console after calling `track`: `Custom event "_____" does not exist`. Originally, the SDK had an expectation that `track` would be used only for event keys that had been previously defined as custom goals in the LaunchDarkly dashboard. That is still often the case, but it is not required and LaunchDarkly no longer sends custom goal names to the SDK, so the warning was happening even if such a goal did exist.

## [2.19.3] - 2021-06-08
_This release is broken and cannot be used._

## [2.19.2] - 2021-06-08
### Fixed:
- Events for the [LaunchDarkly debugger](https://docs.launchdarkly.com/home/flags/debugger) are now properly pre-processed to omit private user attributes, as well as enforce only expected top level attributes are sent.
- Events for the [LaunchDarkly debugger](https://docs.launchdarkly.com/home/flags/debugger) now include the index of the variation responsible for the evaluation result.


## [2.19.1] - 2021-04-01
### Fixed:
- The property `LDOptions.inlineUsersInEvents` was not included in the TypeScript definitions.

## [2.19.0] - 2021-01-27
### Added:
- Added the `alias` method. This method can be used to associate two user objects for analytics purposes. When invoked, this method will queue a new alias event to be sent to LaunchDarkly.
- Added the `autoAliasingOptOut` configuration option. This can be used to control the new automatic aliasing behavior of the `identify` method; by passing `autoAliasingOptOut: true`, `identify` will not automatically generate alias events.

### Changed:
- The `identify` method will now automatically generate an alias event when switching from an anonymous to a known user. This event associates the two users for analytics purposes as they most likely represent a single person.

## [2.18.3] - 2020-11-17
### Fixed:
- Updated the `LDEvaluationDetail.reason` type definition to be nullable. This value will be `null` when `LDOptions.evaluationReasons` is `false`.


## [2.18.2] - 2020-10-19
### Changed:
- With goals that use substring or regex mode for URL matching, the SDK previously was not able to match anything in a URL&#39;s hash fragment. Since some applications use path-like hash fragments (`http://example.com/url/path#/additional/path`), the SDK now considers any hash string that contains a slash to be part of the URL for matching purposes, _if_ the matching mode is substring or regex. Hash strings that do not contain a slash are assumed to be simple HTML anchors and are not included in matching.

## [2.18.1] - 2020-09-14
### Fixed:
- In streaming mode, when connecting to the Relay Proxy rather than directly to the LaunchDarkly streaming service, if the current user was changed twice within a short time it was possible for the SDK to revert to flag values from the previous user.

## [2.18.0] - 2020-07-16
### Added:
- Configuration option `disableSyncEventPost`, for preventing the SDK from trying to do a synchronous HTTP request to deliver analytics events while the page is closing. Such requests are not supported in current versions of Chrome, and although the SDK uses browser detection to avoid doing them if they are not supported, the browser detection mechanism does not work in some test environments.

## [2.17.6] - 2020-07-13
### Fixed:
- Removed uses of `String.startsWith` that caused errors in Internet Explorer unless a polyfill for that function was present.

## [2.17.5] - 2020-05-13
### Fixed:
- The TypeScript declaration for `track()` was missing the optional `metricValue` parameter.

## [2.17.4] - 2020-04-30
### Fixed:
- Some diagnostic event data was being sent twice, resulting in extra HTTP requests. This did not affect analytics events, so customer data on the dashboard and in data export would still be correct.

## [2.17.3] - 2020-03-31
### Fixed:
- The default logging implementation (`createConsoleLogger`) could throw errors in Internet Explorer 11 if log output (of an enabled level) happened while the developer tools were _not_ open. This is because in IE 11, the `console` object [does not exist](https://www.beyondjava.net/console-log-surprises-with-internet-explorer-11-and-edge) unless the tools are open. This has been fixed so the logger does not try to use `console` unless it currently has a value.
- Updated some dependency versions to resolve a security vulnerability in the transitive `acorn` dependency. This dependency is only used for development and as a result the security vulnerability did not affect customers.

## [2.17.2] - 2020-03-18
### Fixed:
- Some users reported an error where the SDK said that the content type of a response was `application/json, application/json; charset=utf8`. It is invalid to have multiple Content-Type values in a response and the LaunchDarkly service does not do this, but an improperly configured proxy/gateway might add such a header. Now the SDK will tolerate a value like this as long as it starts with `application/json`. ([#205](https://github.com/launchdarkly/js-client-sdk/issues/205))
- Fixed incorrect usage of `Object.hasOwnProperty` which could have caused an error if a feature flag had `hasOwnProperty` as its flag key.

## [2.17.1] - 2020-03-06
### Fixed:
- At client initialization time, if the initial flag polling request failed, it would cause an unhandled promise rejection unless the application had called `waitForInitialization()` and provided an error handler for the promise that was returned by that method. While that is correct behavior if the application did call `waitForInitialization()` (any promise that might be rejected should have an error handler attached), it is inappropriate if the application did not call `waitForInitialization()` at all-- which is not mandatory, since the application could use events instead, or `waitUntilReady()`, or might simply not care about waiting for initialization. This has been fixed so that no such promise is created until the first time the application calls `waitForInitialization()`; subsequent calls to the same method will return the same promise (since initialization can only happen once).
- A bug in the event emitter made its behavior unpredictable if an event handler called `on` or `off` while handling an event. This has been fixed so that all event handlers that were defined _at the time the event was fired_ will be called; any changes made will not take effect until the next event.

## [2.17.0] - 2020-02-14
Note: if you are using the LaunchDarkly Relay Proxy to forward events, update the Relay to version 5.10.0 or later before updating to this Node SDK version.

### Added:
- The SDK now periodically sends diagnostic data to LaunchDarkly, describing the version and configuration of the SDK, the architecture and version of the runtime platform, and performance statistics. No credentials, hostnames, or other identifiable values are included. This behavior can be disabled with the `diagnosticOptOut` option, or configured with `diagnosticRecordingInterval`.

### Fixed:
- When using secure mode in conjunction with streaming mode, if an application specified a new `hash` parameter while changing the current user with `identify()`, the SDK was not using the new `hash` value when recomputing the stream URL, causing the stream to fail. (Thanks, [andrao](https://github.com/launchdarkly/js-sdk-common/issues/13)!)
- The `LICENSE.txt` file was accidentally replaced with an incomplete license in an earlier release. The standard Apache 2.0 license file has been restored. ([#202](https://github.com/launchdarkly/js-client-sdk/issues/202))

## [2.16.3] - 2020-02-05
### Fixed:
- Changed some exact version dependencies to "highest compatible" dependencies, to avoid having modules that are also used by the host application loaded twice by NPM. The dependency on `js-sdk-common` is still an exact version dependency so that each release of `js-client-sdk` has well-defined behavior for that internal code.

### Removed:
- Removed an unused transitive dependency on `@babel/polyfill`. (Thanks, [bdwain](https://github.com/launchdarkly/js-sdk-common/pull/7)!)


## [2.16.2] - 2020-01-27
### Fixed:
- If the user started to navigate away from the page, but then did not actually do so (for instance, if the application cancelled the `beforeunload` event, or if a nonstandard URL scheme caused the browser to launch an external app), the SDK could be left in a state where all of its HTTP requests would be made synchronously. This has been fixed so the only synchronous request the SDK makes is when it needs to flush events during a `beforeunload`. (Thanks, [edvinerikson](https://github.com/launchdarkly/js-client-sdk/pull/199)!)

## [2.16.1] - 2020-01-15
**Note:** If you use the Relay Proxy, and have configured it to forward events, please update it to version 5.9.4 or later before using this version of the browser SDK. Otherwise you may encounter CORS errors in the browser.

### Fixed:
- The SDK now specifies a uniquely identifiable request header when sending events to LaunchDarkly to ensure that events are only processed once, even if the SDK sends them two times due to a failed initial attempt.

## [2.16.0] - 2019-12-16
### Added:
- Configuration property `eventCapacity`: the maximum number of analytics events (not counting evaluation counters) that can be held at once, to prevent the SDK from consuming unexpected amounts of memory in case an application generates events unusually rapidly. In JavaScript code this would not normally be an issue, since the SDK flushes events every two seconds by default, but you may wish to increase this value if you will intentionally be generating a high volume of custom or identify events. The default value is 100.
- Configuration properties `wrapperName` and `wrapperVersion`: used by the React SDK, and potentially by third-party libraries, to identify a JS SDK instance that is being used with a wrapper API.

### Changed:
- The SDK now logs a warning if any configuration property has an inappropriate type, such as `baseUri:3` or `sendEvents:"no"`. For boolean properties, the SDK will still interpret the value in terms of truthiness, which was the previous behavior. For all other types, since there's no such commonly accepted way to coerce the type, it will fall back to the default setting for that property; previously, the behavior was undefined but most such mistakes would have caused the SDK to throw an exception at some later point.
- Removed or updated some development dependencies that were causing vulnerability warnings.

### Fixed:
- When calling `identify`, the current user (as reported by `getUser()`) was being updated before the SDK had received the new flag values for that user, causing the client to be temporarily in an inconsistent state where flag evaluations would be associated with the wrong user in analytics events. Now, the current-user state will stay in sync with the flags and change only when they have finished changing. (Thanks, [edvinerikson](https://github.com/launchdarkly/js-sdk-common/pull/3)!)

### Deprecated:
- The `samplingInterval` configuration property was deprecated in the code in the previous minor version release, and in the changelog, but the deprecation notice was accidentally omitted from the documentation comments. It is hereby deprecated again.

## [2.15.2] - 2019-11-15
### Fixed:
- Releases after 2.14.1 were continuing to report the `version` property as "2.14.1". This property will now once again be consistent with the actual release version.

## [2.15.1] - 2019-11-06
### Fixed:
- A runtime dependency on `typedoc` was mistakenly added in the 2.15.0 release. This has been removed.


## [2.15.0] - 2019-11-05
### Changed:
- Changed the behavior of the warning message that is logged on failing to establish a streaming connection. Rather than the current behavior where the warning message appears upon each failed attempt, it will now only appear on the first failure in each series of attempts. Also, the message has been changed to mention that retries will occur. ([#182](https://github.com/launchdarkly/js-client-sdk/issues/182))
- The source code for the `launchdarkly-js-sdk-common` package has been moved out of this repository into [`js-sdk-common`](https://github.org/launchdarkly-js-sdk-common), and will now be versioned separately. Applications should never refer to the common package directly; it is brought in automatically by `launchdarkly-js-client-sdk`. Changes made in the common code that affect JS SDK functionality will be noted in the main changelog here.
- There is a new, much fuller-featured demo application in the `example` directory, which may be useful for testing not only of the JS SDK but of feature flag evaluation in general.

### Fixed:
- The `beforeunload` event handler no longer calls `close` on the client, which was causing the SDK to become unusable if the page did not actually close after this event fired (for instance if the browser navigated to a URL that launched an external application, or if another `beforeunload` handler cancelled leaving the page). Instead, it now only flushes events. There is also an `unload` handler that flushes any additional events that might have been created by any code that ran during the `beforeunload` stage. ([#181](https://github.com/launchdarkly/js-client-sdk/issues/181))
- Removed uses of `Object.assign` that caused errors in Internet Explorer unless a polyfill for that function was present. These were removed earlier in the 2.1.1 release, but had been mistakenly added again.

### Deprecated:
- The `samplingInterval` configuration property is deprecated and will be removed in a future version. The intended use case for the `samplingInterval` feature was to reduce analytics event network usage in high-traffic applications. This feature is being deprecated in favor of summary counters, which are meant to track all events.


## [2.14.0] - 2019-10-10
### Added:
- Added support for upcoming LaunchDarkly experimentation features. See `LDClient.track()`.
- The `createConsoleLogger()` function now has an optional second parameter for customizing the log prefix.

### Changed:
- Log messages now include the level ("[warn]", "[error]", etc.) and have a prefix of "LD:" by default.

### Removed:
- The source code for the `launchdarkly-react-client-sdk` package is no longer part of this monorepo. It is now in its own repository, [`react-client-sdk`](https://github.com/launchdarkly/react-client-sdk). Future updates to the LaunchDarkly React interface will be tracked there.

Note that the React SDK code has moved to its own repository, [`react-client-sdk`](https://github.com/launchdarkly/react-client-sdk). The 2.13.0 release was the last one that had the React wrapper code in the same repository, and from this point on the React package will be versioned separately.

## [2.13.0] - 2019-08-15
### Added:
- A `jsdelivr` entry to `package.json` to specify the primary build artifact and simplify the jsDelivr snippet URL.
- In the React SDK, the new `reactOptions` parameter to `withLDProvider` provides React-specific options that do not affect the underlying JavaScript SDK. Currently, the only such option is `useCamelCaseFlagKeys`, which is true by default but can be set to false to disable the automatic camel-casing of flag keys.

### Changed:
- In the React SDK, when omitting the `user` parameter to `withLDProvider`, an anonymous user will be created. This user will remain constant across browser sessions. Previously a new user was generated on each page load.

## [2.12.5] - 2019-07-29
### Changed:
- The error messages logged upon having an invalid environment/client-side ID have been updated to better clarify what went wrong. ([#165](https://github.com/launchdarkly/js-client-sdk/issues/165))

### Fixed:
- The React SDK was incompatible with Internet Explorer 11 due to using `String.startsWith()`. (Thanks, [cvetanov](https://github.com/launchdarkly/js-client-sdk/pull/169)!)
- There was a broken documentation link in the error message logged when initially sending an event without identifying a user. The broken link has been fixed.

## [2.12.4] - 2019-07-10
### Changed:
- The `useReport` property, which tells the SDK to use the REPORT method for HTTP requests so that user data will not appear in the URL path, was only actually using REPORT for requesting all flags at once— not for streaming updates, because streaming uses the EventSource API which normally can only use the GET method; so, to avoid exposing user data in the URL for the streaming connection, the SDK had to use a different and slower mechanism (in which all of the flags are reloaded whenever there is a change) if `useReport` was true. That is still the case by default; but, if you load the specific EventSource [polyfill implementation](https://docs.launchdarkly.com/sdk/client-side/javascript/requirements-polyfills) [`launchdarkly-eventsource`](https://github.com/launchdarkly/js-eventsource) (v1.1.0 or later), the SDK _can_ now use REPORT for streaming connections.

### Fixed:
- The `homepage` attribute in the `launchdarkly-react-client-sdk` and `launchdarkly-react-client-sdk-example` packages has been updated to the correct value.

## [2.12.3] - 2019-07-08
### Added:
- The SDK now logs a message at `info` level when the stream connection is started or stopped. It also logs a message at `warn` level if it detects that the stream had to be restarted due to a connection failure; however, in browsers that have native support for EventSource, connection restarts may be handled internally by the browser in which case there will be no log message.

### Changed:
- When providing precomputed flag values to the SDK via the `bootstrap` option, these values will now be immediately available as soon as `initialize()` returns. That was already the behavior in earlier versions of the SDK, but ever since version 2.10.0 the values only became available once the client was officially ready (i.e. the `ready` event had fired or the `waitUntilInitialized()` promise had resolved), so they could not be used in non-asynchronous application code. The correct behavior had never been explicitly defined, so this had not been documented as a change. The behavior is now as it was prior to 2.10.0, and is now documented as such. ([#162](https://github.com/launchdarkly/js-client-sdk/issues/162))

### Fixed:
- Under some circumstances, the SDK would fail to restart a streaming connection if it had already been dropped and restarted before. This normally would not happen when using a built-in browser implementation of EventSource, but could happen with some EventSource polyfills.
- Fixed a broken link in the project README.

## [2.1.2] - 2019-06-28
### Fixed:
- The `eventUrlTransformer` property that was added in 2.12.0 had no effect. It now works.


## [2.12.1] - 2019-06-28
### Added:
- The SDK now logs a message at `info` level when the stream connection is started or stopped. It also logs a message at `warn` level if it detects that the stream had to be restarted due to a connection failure; however, in browsers that have native support for EventSource, connection restarts may be handled internally by the browser in which case there will be no log message.

### Fixed:
- Under some circumstances, the SDK would fail to restart a streaming connection if it had already been dropped and restarted before. This normally would not happen when using a built-in browser implementation of EventSource, but could happen with some EventSource polyfills.
- Fixed a broken link in the project README.

## [2.12.0] - 2019-06-18
### Added:
- Configuration property `eventUrlTransformer` allows application code to modify the URL that is sent in analytics events.
### Fixed:
- If the SDK receives data from the service that does not have the expected JSON content type, it will now log an appropriate error message, rather than "Error fetching flags: 200".

## [2.11.0] - 2019-06-06
### Added:
- Added support for hooks to the React SDK.

## [2.10.4] - 2019-05-22
### Added:
- `unpkg` entry to `package.json` to specify primary build artifact to simplify the unpkg snippet URL.
### Fixed:
- Streaming updates did not work if `useReport` was enabled, or if the SDK was connecting through the LaunchDarkly relay proxy. This bug was introduced in version 2.10.0.

## [2.10.3] - 2019-05-08
### Changed:
- Changed the package names from `ldclient-js`, `ldclient-react`, and `ldclient-js-common` to `launchdarkly-js-client-sdk`, `launchdarkly-react-client-sdk`, and `launchdarkly-js-sdk-common`, respectively.

There are no other changes in this release. Substituting `ldclient-js`, `ldclient-react`, and `ldclient-js-common` version 2.10.2 with `launchdarkly-js-client-sdk`, `launchdarkly-react-client-sdk`, and `launchdarkly-js-sdk-common` version 2.10.3 will not affect functionality.

### Fixed:
- Fixed some broken links in the package READMEs.

## [2.10.2] - 2019-05-01
### Fixed:
- Fixed a problem that prevented the Electron and client-side Node SDKs from reporting their own version strings correctly. This fix does not affect the browser JS SDK, so there is no need to upgrade if you are using that.

### Note on future releases:

The LaunchDarkly SDK repositories are being renamed for consistency. This repository is now `js-client-sdk` rather than `js-client`.

The package names will also change. In the 2.10.2 release, there were packages for `ldclient-js`, `ldclient-react` and `ldclient-js-common`; in all future releases, they will be `launchdarkly-js-client-sdk`, `launchdarkly-react-client-sdk`, and `launchdarkly-js-sdk-common`, respectively.

## [2.10.1] - 2019-04-23
### Fixed:
- The 2.10.0 release added a usage of the `Promise.finally()` method, which made it incompatible with some older browsers. This has been removed. ([#151](https://github.com/launchdarkly/js-client/issues/151))

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
- To reduce the network bandwidth used for analytics events, feature request events are now sent as counters rather than individual events, and user details are now sent only at intervals rather than in each event. These behaviors can be modified through the LaunchDarkly UI and with the new configuration option `inlineUsersInEvents`. For more details, see [Data Export](https://docs.launchdarkly.com/home/data-export).
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

* Support for [private user attributes](https://docs.launchdarkly.com/home/users/attributes#creating-private-user-attributes).
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
