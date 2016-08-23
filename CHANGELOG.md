# Change log

All notable changes to the LaunchDarkly client-side JavaScript SDK will be documented in this file. This project adheres to [Semantic Versioning](http://semver.org).

## [1.0.6] - 2016-08-23
### Changed
- Added check for EventSource before trying to connect Stream.

## [1.0.5] - 2016-08-22
### Changed
- Fixed an error that occurred on `hashchage`/`popstate` if the account had no goals.

## [1.0.4] - 2016-08-12
### Changed
- Added window check for server side rendering compatibility before loading Sizzle.
