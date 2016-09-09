# Change log

All notable changes to the LaunchDarkly client-side JavaScript SDK will be documented in this file. This project adheres to [Semantic Versioning](http://semver.org).

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
