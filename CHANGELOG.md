# Change log

All notable changes to the LaunchDarkly client-side JavaScript SDK will be documented in this file. This 
project adheres to [Semantic Versioning](http://semver.org).

## [1.2.0] - 2017-12-15
### Added
- Added `useReport` initialization option to use `REPORT` instead of `GET` when communicating with LaunchDarkly.
### Fixed
- Authentication errors will now be logged — the root cause for these errors is usually an invalid
  client-side ID.

## [1.1.13] - 2017-12-12
### Changed
- Emit an `error` event — separately from the `ready` event — in case fetching initial data fails. This allows consumers to respond accordingly.

## [1.1.12] - 2017-06-09
### Changed
- Improve error handling

## [1.1.11] - 2017-05-16
### Added
- Add typescript definitions

## [1.1.10] - 2017-05-04
### Added
- Add a warning when tracking unknown custom goal events

## [1.1.9] - 2017-04-07
### Fixed
- Changed default stream url

## [1.1.8] - 2017-02-02
### Fixed
- Cached `localStorage` copy is not overwritten anymore when connection to LD fails

## [1.1.7] - 2017-01-27
### Changed
- `onDone` argument to `identify` method is now optional

## [1.1.6] - 2017-01-16
### Changed
- Removed dependency on Sizzle and direct to polyfill for older browser support

## [1.1.5] - 2016-12-07
### Changed
- Fix bug in `Emitter.off()`

## [1.1.4] - 2016-10-26
### Changed
- Fix bug caused by accessing `undefined` flags

## [1.1.3] - 2016-10-14
### Changed
- Fix bug caused by accessing `undefined` settings

## [1.1.2] - 2016-09-21
### Changed
- Ensure callbacks only ever get called once

## [1.1.1] - 2016-09-20
### Changed
- Fix flag setting request cancellation logic

## [1.1.0] - 2016-09-14
### Added
- Add a new `allFlags` method that returns a map of all feature flag keys and their values for a user

## [1.0.8] - 2016-09-09
### Changed
- Added 'undefined' check on VERSION otherwise unbundled usage from npm fails

## [1.0.7] - 2016-09-06
### Changed
- Expose SDK version at `LDClient.version`

## [1.0.6] - 2016-08-23
### Changed
- Added check for EventSource before trying to connect Stream.

## [1.0.5] - 2016-08-22
### Changed
- Fixed an error that occurred on `hashchage`/`popstate` if the account had no goals.

## [1.0.4] - 2016-08-12
### Changed
- Added window check for server side rendering compatibility before loading Sizzle.
