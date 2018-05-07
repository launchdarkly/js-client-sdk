# Change log

All notable changes to the LaunchDarkly client-side JavaScript SDK will be documented in this file. 
This project adheres to [Semantic Versioning](http://semver.org).

## [1.7.2] - 2018-05-07
### Fixed
- The client no longer creates an empty `XMLHttpRequest` at startup time (which could interfere with unit tests).

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
